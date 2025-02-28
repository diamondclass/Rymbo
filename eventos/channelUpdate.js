const { EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const { fecthDataBase } = require('../functions');

const creatorIdToIgnore = [
    '1277124708369961021', '508391840525975553', '1052415589995516014',
    '824119071556763668', '905883534521139210', '808346067317162015',
    '710034409214181396', '883857478540984360', '155149108183695360',
    '557628352828014614', '416358583220043796', '678344927997852742',
    '576395920787111936', '282859044593598464', '817892729173311549',
    '762217899355013120', '703886990948565003', '159985870458322944',
    '458276816071950337', '543567770579894272', '536991182035746816'
];

const recentUpdates = new Map();

module.exports = async (client, channel) => {
    if (!channel.guild) return;
    const cacheKey = `${channel.id}-${Date.now()}`;
    if (recentUpdates.has(channel.id)) {
        const lastUpdate = recentUpdates.get(channel.id);
        if (Date.now() - lastUpdate < 5000) return;
    }
    recentUpdates.set(channel.id, Date.now());
    setTimeout(() => recentUpdates.delete(channel.id), 10000);
    let _guild;
    try {
        _guild = await fecthDataBase(client, channel.guild, false);
        if (!_guild) return;
    } catch (err) {
        console.error('Error fetching guild database:', err);
        return;
    }
    try {
        const requiredPermissions = [PermissionsBitField.Flags.ViewAuditLog, PermissionsBitField.Flags.BanMembers];
        const missingPermissions = requiredPermissions.filter(perm => !channel.guild.members.me.permissions.has(perm));
        if (missingPermissions.length > 0) {
            console.warn(`Missing permissions in guild ${channel.guild.id}: ${missingPermissions.join(', ')}`);
            return;
        }
        const auditLogs = await fetchAuditLogsWithRetry(channel);
        if (!auditLogs) return;
        const logEntry = auditLogs.entries.first();
        if (!logEntry || logEntry.createdTimestamp < (Date.now() - 5000)) return;
        const executor = logEntry.executor;
        if (!executor) return;
        if (_guild.configuration.whitelist.includes(executor.id) || creatorIdToIgnore.includes(executor.id)) return;
        if (_guild.configuration.logs[0] && logEntry.changes && logEntry.changes.length > 0) {
            await processChannelUpdate(client, channel, logEntry, _guild);
        }
        if (_guild.protection.antiraid.enable) {
            await handleAntiRaid(client, channel, executor, _guild);
        }
        if (_guild.protection.raidmode.enable) {
            await handleRaidMode(client, channel, executor, _guild);
        }
    } catch (err) {
        console.error('Error in channelUpdate event:', err);
    }
};

async function fetchAuditLogsWithRetry(channel, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            return await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelUpdate,
                limit: 1
            });
        } catch (err) {
            if (i === attempts - 1) console.error('Failed to fetch audit logs:', err);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return null;
}

async function processChannelUpdate(client, channel, logEntry, _guild) {
    const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
    if (!logChannel) return;
    const changes = logEntry.changes
        .filter(change => change.old !== change.new)
        .map(change => `**${change.key}**: ${change.old} → ${change.new}`)
        .join('\n');
    if (!changes) return;
    const embed = new EmbedBuilder()
        .setColor("#00ADEF")
        .setTitle("📝 Canal Actualizado")
        .addFields(
            { name: 'Canal', value: `${channel.name} (${channel.id})`, inline: true },
            { name: 'Modificado por', value: `${logEntry.executor.tag} (${logEntry.executor.id})`, inline: true },
            { name: 'Cambios Realizados', value: changes, inline: false }
        )
        .setTimestamp();
    if (channel.parent) {
        embed.addFields({ name: 'Categoría', value: channel.parent.name, inline: true });
    }
    try {
        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Error sending update log:', err);
    }
}

async function handleAntiRaid(client, channel, executor, _guild) {
    const cacheKey = `raid-${channel.guild.id}`;
    const cache = await client.super.cache.get(cacheKey, true) || { amount: 0, lastReset: Date.now() };
    if (Date.now() - cache.lastReset > 10000) {
        cache.amount = 0;
        cache.lastReset = Date.now();
    }
    cache.amount++;
    await client.super.cache.up(cacheKey, cache);
    if (cache.amount >= 3) {
        try {
            await channel.guild.members.ban(executor, { reason: 'Anti-raid: Mass channel updates' });
            await sendRaidBanLog(client, channel, executor, _guild);
            if (executor.bot && _guild.protection.antiraid.saveBotsEntrities) {
                await handleBotAuthorBan(client, channel, executor, _guild);
            }
        } catch (err) {
            console.error('Error in anti-raid handling:', err);
        }
    }
}

async function handleRaidMode(client, channel, executor, _guild) {
    try {
        await channel.guild.members.ban(executor, { reason: 'Raidmode active' });
        await sendRaidmodeBanLog(client, channel, executor, _guild);
    } catch (err) {
        console.error('Error in raid mode handling:', err);
    }
}

async function handleBotAuthorBan(client, channel, bot, _guild) {
    if (_guild.protection.antiraid.saveBotsEntrities._bot === bot.id) {
        try {
            const authorId = _guild.protection.antiraid.saveBotsEntrities.authorOfEntry;
            await channel.guild.members.ban(authorId, { reason: 'Bot owner banned (anti-raid)' });
            await sendBotAuthorBanLog(client, channel, authorId, _guild);
        } catch (err) {
            console.error('Error banning bot author:', err);
        }
    }
}

async function sendRaidBanLog(client, channel, user, _guild) {
    const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
        .setColor("#00ADEF")
        .setTitle("🛡️ Usuario Baneado (Anti-Raid)")
        .addFields(
            { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Razón', value: 'Modificaciones masivas de canales detectadas', inline: true },
            { name: 'Canal Afectado', value: `${channel.name} (${channel.id})`, inline: true }
        )
        .setTimestamp();
    await logChannel.send({ embeds: [embed] }).catch(() => {});
}

async function sendBotAuthorBanLog(client, channel, authorId, _guild) {
    const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
        .setColor("#00ADEF")
        .setTitle("🤖 Autor de Bot Baneado")
        .addFields(
            { name: 'ID del Autor', value: authorId, inline: true },
            { name: 'Razón', value: 'Autor de bot malicioso', inline: true },
            { name: 'Canal Afectado', value: `${channel.name} (${channel.id})`, inline: true }
        )
        .setTimestamp();
    await logChannel.send({ embeds: [embed] }).catch(() => {});
}

async function sendRaidmodeBanLog(client, channel, user, _guild) {
    const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
        .setColor("#00ADEF")
        .setTitle("⚠️ Usuario Baneado (Modo Raid)")
        .addFields(
            { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Razón', value: 'Servidor en modo raid', inline: true },
            { name: 'Canal Afectado', value: `${channel.name} (${channel.id})`, inline: true }
        )
        .setTimestamp();
    await logChannel.send({ embeds: [embed] }).catch(() => {});
}
