const Guild = require('../schemas/guildsSchema');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');

const processedEvents = new Map();

module.exports = async (client, oldMember, newMember) => {
    let _guild = await fecthDataBase(client, newMember.guild, false);
    if (!_guild || !_guild.configuration.logs[0]) return;
    const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
    if (!logChannel) return;
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const logs = await newMember.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberRoleUpdate,
            limit: 1
        });
        const memberUpdateLog = logs.entries.first();
        if (!memberUpdateLog) return;
        if (Date.now() - memberUpdateLog.createdTimestamp > 5000) return;
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
        const changeIdentifier = `roles-${Array.from(addedRoles.keys()).join(',')}-${Array.from(removedRoles.keys()).join(',')}`;
        const eventId = `${memberUpdateLog.id}-${changeIdentifier}`;
        if (processedEvents.has(eventId)) return;
        processedEvents.set(eventId, Date.now());
        const now = Date.now();
        for (const [key, timestamp] of processedEvents.entries()) {
            if (now - timestamp > 10000) {
                processedEvents.delete(key);
            }
        }
        if (addedRoles.size > 0) {
            const addedRolesEmbed = new EmbedBuilder()
                .setColor("#00ADEF")
                .setTitle('📝 Rol Añadido')
                .setDescription(`**Usuario:** ${newMember.user.tag}\n**Rol añadido:** ${addedRoles.map(role => role.name).join(', ')}\n**Modificado por:** ${memberUpdateLog.executor.tag}`)
                .setTimestamp()
                .setFooter({ text: `ID: ${newMember.id}` });
            await logChannel.send({ embeds: [addedRolesEmbed] }).catch(() => {});
        }
        if (removedRoles.size > 0) {
            const removedRolesEmbed = new EmbedBuilder()
                .setColor("#00ADEF")
                .setTitle('📝 Rol Removido')
                .setDescription(`**Usuario:** ${newMember.user.tag}\n**Rol removido:** ${removedRoles.map(role => role.name).join(', ')}\n**Modificado por:** ${memberUpdateLog.executor.tag}`)
                .setTimestamp()
                .setFooter({ text: `ID: ${newMember.id}` });
            await logChannel.send({ embeds: [removedRolesEmbed] }).catch(() => {});
        }
        if (oldMember.nickname !== newMember.nickname) {
            const nicknameEmbed = new EmbedBuilder()
                .setColor("#00ADEF")
                .setTitle('📝 Nickname Actualizado')
                .setDescription(`**Usuario:** ${newMember.user.tag}\n**Nickname anterior:** ${oldMember.nickname || 'Ninguno'}\n**Nuevo nickname:** ${newMember.nickname || 'Ninguno'}\n**Modificado por:** ${memberUpdateLog.executor.tag}`)
                .setTimestamp()
                .setFooter({ text: `ID: ${newMember.id}` });
            await logChannel.send({ embeds: [nicknameEmbed] }).catch(() => {});
        }
    } catch (err) {
        console.error('Error en el evento guildMemberUpdate:', err);
    }
};
