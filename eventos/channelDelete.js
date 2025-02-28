const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');
const RAID_THRESHOLD = 5;
const RAID_TIME_WINDOW = 10000;
const creatorIdToIgnore = [
    '1277124708369961021', '508391840525975553', '1052415589995516014',
    '824119071556763668', '883857478540984360', '155149108183695360',
    '905883534521139210', '808346067317162015', '710034409214181396',
    '557628352828014614', '416358583220043796', '678344927997852742',
    '576395920787111936', '282859044593598464', '817892729173311549',
    '762217899355013120', '703886990948565003', '159985870458322944',
    '458276816071950337', '543567770579894272', '536991182035746816'
];
class DeletedChannelsCache {
    constructor() {
        this.cache = new Map();
        this.cleanup();
    }
    cleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.cache.entries()) {
                const filtered = value.filter(item => now - item.timestamp < RAID_TIME_WINDOW);
                if (filtered.length === 0) {
                    this.cache.delete(key);
                } else {
                    this.cache.set(key, filtered);
                }
            }
        }, RAID_TIME_WINDOW);
    }
    set(key, value) {
        return this.cache.set(key, value);
    }
    get(key) {
        return this.cache.get(key);
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    entries() {
        return this.cache.entries();
    }
}
const deletedChannelsCache = new DeletedChannelsCache();
module.exports = async (client, channel) => {
    try {
        const deletedChannelInfo = {
            name: channel.name,
            id: channel.id,
            type: channel.type,
            parent: channel.parent ? {
                name: channel.parent.name,
                id: channel.parent.id
            } : null,
            position: channel.position,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser,
            permissionOverwrites: Array.from(channel.permissionOverwrites.cache.values())
        };
        if (!deletedChannelsCache.has('recent_deletions')) {
            deletedChannelsCache.set('recent_deletions', []);
        }
        const recentDeletionsGlobal = deletedChannelsCache.get('recent_deletions');
        recentDeletionsGlobal.push({
            info: deletedChannelInfo,
            timestamp: Date.now()
        });
        deletedChannelsCache.set('recent_deletions', recentDeletionsGlobal);
        const guildData = await fecthDataBase(client, channel.guild, false);
        if (!guildData) return;
        const auditLogs = await channel.guild.fetchAuditLogs({
            type: 12,
            limit: 1
        }).catch(console.error);
        if (!auditLogs?.entries.size) return;
        const logEntry = auditLogs.entries.first();
        const executor = logEntry.executor;
        if (!executor) return;
        if (guildData.configuration.logs?.[0]) {
            await sendImmediateLog(client, guildData, deletedChannelInfo);
            await sendExecutorLog(client, guildData, deletedChannelInfo, executor);
        }
        if (guildData.configuration.whitelist.includes(executor.id) || creatorIdToIgnore.includes(executor.id)) {
            return;
        }
        if (guildData.protection.antiraid?.enable) {
            const cache = await client.super.cache.get(channel.guild.id, true);
            if (cache.amount >= 3) {
                await handleRaidDetection(client, channel.guild, executor, guildData);
                const recentDeletions = deletedChannelsCache.get('recent_deletions') || [];
                await restoreRaidedChannels(client, channel.guild, recentDeletions, guildData);
            } else {
                client.super.cache.up(channel.guild.id, cache);
                setTimeout(() => client.super.cache.delete(channel.guild.id), 10000);
            }
        }
        if (guildData.protection.antichannels?.enable) {
            if (!deletedChannelsCache.has(executor.id)) {
                deletedChannelsCache.set(executor.id, []);
            }
            const userDeletedChannels = deletedChannelsCache.get(executor.id);
            userDeletedChannels.push({
                info: deletedChannelInfo,
                timestamp: Date.now()
            });
            await recreateChannel(client, channel.guild, deletedChannelInfo, executor, guildData);
            const recentDeletions = userDeletedChannels.filter(
                deletion => Date.now() - deletion.timestamp < RAID_TIME_WINDOW
            );
            if (recentDeletions.length >= RAID_THRESHOLD) {
                await handleRaid(client, channel.guild, executor, userDeletedChannels, guildData);
                deletedChannelsCache.delete(executor.id);
            }
            deletedChannelsCache.set(executor.id, recentDeletions);
        }
        if (guildData.protection.raidmode?.enable && channel.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await channel.guild.members.ban(executor, { 
                reason: 'Raidmode activado - Eliminación de canales detectada' 
            }).catch(console.error);
        }
        await updateDataBase(client, channel.guild, guildData, true);
    } catch (error) {
        console.error('Error in channelDelete event:', error);
    }
};
async function restoreRaidedChannels(client, guild, deletedChannels, guildData) {
    try {
        const restoredChannels = [];
        for (const channelData of deletedChannels) {
            const existingChannel = guild.channels.cache.find(ch => 
                ch.name === channelData.info.name && 
                ch.parent?.id === channelData.info.parent?.id
            );
            if (!existingChannel) {
                const newChannel = await recreateChannel(client, guild, channelData.info, null, guildData);
                if (newChannel) {
                    restoredChannels.push(newChannel);
                }
            }
        }
        if (restoredChannels.length > 0 && guildData.configuration.logs?.[0]) {
            const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("🔄 Restauración Masiva de Canales")
                    .setDescription(`Se han restaurado ${restoredChannels.length} canales después del raid`)
                    .addFields({ name: 'Canales Restaurados', value: restoredChannels.map(ch => ch.name).join('\n') })
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error restoring raided channels:', error);
    }
}
async function handleRaidDetection(client, guild, executor, guildData) {
    try {
        await guild.members.ban(executor, { reason: 'Raid detectado - Eliminación masiva de canales' });
        if (executor.bot && guildData.protection.antiraid.saveBotsEntrities) {
            if (guildData.protection.antiraid.saveBotsEntrities._bot === executor.id) {
                await guild.members.ban(guildData.protection.antiraid.saveBotsEntrities.authorOfEntry).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error handling raid detection:', error);
    }
}
async function handleRaid(client, guild, executor, deletedChannels, guildData) {
    try {
        if (guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await guild.members.ban(executor, {
                reason: `Raid Detectado - Eliminación de ${deletedChannels.length} canales en ${RAID_TIME_WINDOW/1000} segundos`
            });
            await sendBanLog(client, guild, executor, 'Raid Detectado - Eliminación masiva de canales');
        }
        for (const channelData of deletedChannels) {
            const existingChannel = guild.channels.cache.find(ch => ch.name === channelData.info.name);
            if (!existingChannel) {
                await recreateChannel(client, guild, channelData.info, executor, guildData);
            }
        }
        if (guildData.configuration.logs?.[0]) {
            try {
                const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle("🛡️ Recuperación de Raid Completada")
                        .setDescription(`Se han restaurado ${deletedChannels.length} canales eliminados durante el raid`)
                        .addFields(
                            { name: 'Usuario Baneado', value: `${executor.tag} (${executor.id})`, inline: true },
                            { name: 'Tiempo de Detección', value: `${RAID_TIME_WINDOW/1000} segundos`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error sending raid recovery log:', error);
            }
        }
    } catch (error) {
        console.error('Error handling raid:', error);
    }
}
async function recreateChannel(client, guild, channelInfo, executor, guildData) {
    try {
        const channelOptions = {
            name: channelInfo.name,
            type: convertChannelType(channelInfo.type),
            position: channelInfo.position || 0,
            topic: channelInfo.topic || null,
            nsfw: channelInfo.nsfw || false,
            bitrate: channelInfo.bitrate || undefined,
            userLimit: channelInfo.userLimit || undefined,
            rateLimitPerUser: channelInfo.rateLimitPerUser || 0,
            reason: 'Canal restaurado por sistema de protección'
        };
        if (channelInfo.parent?.id) {
            channelOptions.parent = channelInfo.parent.id;
        }
        if (channelInfo.permissionOverwrites?.length > 0) {
            channelOptions.permissionOverwrites = channelInfo.permissionOverwrites.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow,
                deny: overwrite.deny
            }));
        }
        const newChannel = await guild.channels.create(channelOptions);
        return newChannel;
    } catch (error) {
        console.error('Error recreating channel:', error);
        return null;
    }
}
function convertChannelType(type) {
    const typeMap = {
        GUILD_TEXT: 0,
        GUILD_VOICE: 2,
        GUILD_CATEGORY: 4,
        GUILD_NEWS: 5,
        GUILD_STORE: 6,
        GUILD_NEWS_THREAD: 10,
        GUILD_PUBLIC_THREAD: 11,
        GUILD_PRIVATE_THREAD: 12,
        GUILD_STAGE_VOICE: 13,
        GUILD_FORUM: 15
    };
    if (typeof type === 'number') return type;
    return typeMap[type] || 0;
}
async function sendImmediateLog(client, guildData, channelInfo) {
    if (!guildData.configuration.logs[0]) return;
    try {
        const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle("🗑️ Canal Eliminado")
            .setDescription(`Se ha detectado la eliminación de un canal`)
            .addFields(
                { name: 'Nombre del Canal', value: channelInfo.name || 'Desconocido', inline: true },
                { name: 'ID del Canal', value: channelInfo.id || 'Desconocido', inline: true },
                { name: 'Tipo de Canal', value: String(channelInfo.type) || 'Desconocido', inline: true }
            )
            .setTimestamp();
        if (channelInfo.parent) {
            embed.addFields({ name: 'Categoría', value: channelInfo.parent.name, inline: true });
        }
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending immediate log:', error);
    }
}
async function sendExecutorLog(client, guildData, channelInfo, executor) {
    if (!guildData.configuration.logs[0]) return;
    try {
        const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle("🗑️ Detalles de Canal Eliminado")
            .addFields(
                { name: 'Canal', value: `${channelInfo.name} (${channelInfo.id})`, inline: true },
                { name: 'Eliminado por', value: `${executor.tag} (${executor.id})`, inline: true }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending executor log:', error);
    }
}
async function sendBanLog(client, guild, executor, reason) {
    try {
        const guildData = await fecthDataBase(client, guild, false);
        if (!guildData?.configuration.logs[0]) return;
        const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
        if (!logChannel) return;
        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("🔨 Usuario Baneado")
            .addFields(
                { name: 'Usuario', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: 'Razón', value: reason, inline: true }
            )
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending ban log:', error);
    }
}
