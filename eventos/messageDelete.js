const { EmbedBuilder, PermissionsBitField, ActivityType } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');

module.exports = async (client, message) => {
    if (!message.guild || !message.channel) return;
    if (message.channel.type === 1) return;
    if (message.webhookId || !message.author || !message.author.id) return;
    if (message.partial) await message.fetch().catch(() => null);

    let _guild = await fecthDataBase(client, message.guild, false);
    if (!_guild) return;

    const creatorsToIgnore = [
        '1277124708369961021', '508391840525975553', '1052415589995516014',
        '824119071556763668', '905883534521139210', '808346067317162015',
        '710034409214181396', '883857478540984360', '155149108183695360',
        '557628352828014614', '416358583220043796', '678344927997853742',
        '576395920787111936', '282859044593598464', '817892729173311549',
        '762217899355013120', '703886990948565003', '159985870458322944',
        '458276816071950337', '543567770579894272', '536991182035746816'
    ];

    if (!client.super.cache.has(message.guild.id)) client.super.cache.setGuildBase(message.guild.id);
    let cache = client.super.cache.get(message.guild.id, true);

    try {
        if (_guild.protection?.antiRaid?.enable) {
            if (!cache.messageDeleteCount) cache.messageDeleteCount = {};

            const userId = message.author.id;
            const currentTime = Date.now();

            if (!cache.messageDeleteCount[userId]) {
                cache.messageDeleteCount[userId] = { count: 1, firstDeleteTime: currentTime };
            } else {
                const userData = cache.messageDeleteCount[userId];
                if (currentTime - userData.firstDeleteTime <= 1000) userData.count++;
                else {
                    userData.count = 1;
                    userData.firstDeleteTime = currentTime;
                }
            }

            if (cache.messageDeleteCount[userId].count > 15 && !creatorsToIgnore.includes(userId)) {
                if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    await message.guild.members.ban(message.author, { reason: 'Probable raid (borrado masivo de mensajes).' });
                    
                    const logChannel = _guild.configuration.logs[0];
                    if (logChannel) {
                        const logChannelObj = client.channels.cache.get(logChannel);
                        if (logChannelObj) await logChannelObj.send(`**LOG:** Usuario baneado por probable raid: ${message.author.tag}`);
                    }
                }
                delete cache.messageDeleteCount[userId];
            }
        }

        const logChannel = _guild.configuration.logs[0];
        if (logChannel) {
            const logChannelObj = client.channels.cache.get(logChannel);
            if (!logChannelObj) return;

            if (_guild.moderation?.dataModeration?.events?.ghostping && message.mentions.members.first() && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                await logChannelObj.send({
                    content: '`LOG:` Ghostping detectado (Mensaje borrado).',
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#00ADEF")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setDescription(message.content ?? '> `Sin contenido en el mensaje.`')
                            .setImage(message.attachments.size > 0 ? message.attachments.first().proxyURL : null)
                    ]
                });

                if (_guild.moderation.automoderator?.enable && _guild.moderation.automoderator.events.ghostping) {
                    await automoderator(client, _guild, message, 'Menciones fantasmas.');
                }
            } else {
                await logChannelObj.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#00ADEF")
                            .setTitle("📝 Mensaje eliminado")
                            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                            .setDescription(message.content ?? '> `Sin contenido en el mensaje.`')
                            .addFields(
                                { name: 'Canal:', value: `<#${message.channel.id}>`, inline: true },
                                { name: 'Bot:', value: `\`${message.author.bot}\``, inline: true }
                            )
                    ]
                });
            }
        }

        await updateDataBase(client, message.guild, _guild, true);
        client.super.cache.post(message.guild.id, cache);

    } catch (err) {
        console.error('Error al enviar el log de eliminación de mensaje:', err);
    }
};