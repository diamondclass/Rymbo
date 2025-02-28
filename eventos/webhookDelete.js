const { AuditLogEvent, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');

const creatorIdToIgnore = [
    '1277124708369961021', '508391840525975553', '1052415589995516014',
    '824119071556763668', '883857478540984360', '155149108183695360',
    '905883534521139210', '808346067317162015', '710034409214181396',
    '557628352828014614', '416358583220043796', '678344927997853742',
    '576395920787111936', '282859044593598464', '817892729173311549',
    '762217899355013120', '703886990948565003', '159985870458322944',
    '458276816071950337', '543567770579894272', '536991182035746816'
];

async function sendWebhookDeletionLog(client, _guild, webhook, executor) {
    try {
        const logChannel = await client.channels.fetch(_guild.configuration.logs[0]);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("🗑️ Webhook Eliminado")
            .setDescription(`Se ha detectado la eliminación de un webhook`)
            .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL() })
            .addFields(
                { name: 'Nombre del Webhook', value: webhook.name, inline: true },
                { name: 'ID del Webhook', value: webhook.id, inline: true },
                { name: 'Canal', value: `${webhook.channel.name} (${webhook.channel.id})`, inline: true },
                { name: 'Eliminado por', value: `${executor.tag} (${executor.id})`, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Error al enviar log de eliminación de webhook:', err);
    }
}

async function sendBanLog(client, _guild, executor, reason) {
    try {
        const logChannel = await client.channels.fetch(_guild.configuration.logs[0]);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle("⛔ Usuario Baneado")
            .setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL() })
            .addFields(
                { name: 'Usuario', value: `${executor.tag} (${executor.id})`, inline: true },
                { name: 'Razón', value: reason, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Error al enviar log de baneo:', err);
    }
}

module.exports = async (client, webhook) => {
    try {
        let _guild = await fecthDataBase(client, webhook.guild, false);
        if (!_guild) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        const auditLogs = await webhook.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookDelete, limit: 1 });
        const logEntry = auditLogs.entries.first();
        if (!logEntry) return;

        const executor = logEntry.executor;

        if (_guild.configuration.logs?.[0]) {
            await sendWebhookDeletionLog(client, _guild, webhook, executor);
        }

        if (!_guild.protection.antiwebhook?.enable) return;

        if (creatorIdToIgnore.includes(executor.id) || _guild.configuration.whitelist?.includes(executor.id)) return;

        if (!client.super.cache.webhookDeletions) client.super.cache.webhookDeletions = {};

        if (!client.super.cache.webhookDeletions[executor.id]) {
            client.super.cache.webhookDeletions[executor.id] = [];
        }

        client.super.cache.webhookDeletions[executor.id].push(webhook.id);

        if (client.super.cache.webhookDeletions[executor.id].length >= 3) {
            if (webhook.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                await webhook.guild.members.ban(executor, { reason: 'Eliminación excesiva de webhooks (3+)' });
                if (_guild.configuration.logs?.[0]) {
                    await sendBanLog(client, _guild, executor, 'Eliminación excesiva de webhooks (3+)');
                }
                delete client.super.cache.webhookDeletions[executor.id];
            }
        }

        const cache = client.super.cache.get(webhook.guild.id, true) || { amount: 0 };
        cache.amount++;

        if (cache.amount >= 3) {
            if (webhook.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers) && 
                !creatorIdToIgnore.includes(executor.id) && 
                !_guild.configuration.whitelist?.includes(executor.id)) {
                await webhook.guild.members.ban(executor, { reason: 'Eliminación masiva de webhooks (Raid)' });
                if (_guild.configuration.logs?.[0]) {
                    await sendBanLog(client, _guild, executor, 'Eliminación masiva de webhooks (Raid)');
                }
            }
            client.super.cache.delete(webhook.guild.id);
        } else {
            client.super.cache.up(webhook.guild.id, cache);
            setTimeout(() => client.super.cache.delete(webhook.guild.id), 10000);
        }

        await updateDataBase(client, webhook.guild, _guild, true);

    } catch (err) {
        console.error('Error en el evento webhookDelete:', err);
    }
};