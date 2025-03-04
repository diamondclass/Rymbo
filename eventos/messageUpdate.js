const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../schemas/guildsSchema');
const { fecthDataBase, updateDataBase, ratelimitFilter } = require('../functions');

module.exports = async (client, oldMessage, newMessage) => {
    if (!newMessage.guild || !newMessage.channel) return;
    if (newMessage.channel.type === 1) return;
    if (newMessage.webhookId || !newMessage.author?.id) return;
    if (newMessage.partial) await newMessage.fetch().catch(() => null);
    if (newMessage.author.bot) return;

    let _guild = await fecthDataBase(client, newMessage.guild, false);
    if (!_guild) return;

    if (!client.super.cache.has(newMessage.guild.id)) client.super.cache.setGuildBase(newMessage.guild.id);
    let cache = client.super.cache.get(newMessage.guild.id, true);

    try {
        if (_guild.configuration.logs?.[0] && oldMessage.content !== newMessage.content) {
            if (!newMessage.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && 
                _guild.moderation?.dataModeration?.events?.ghostping && 
                oldMessage.mentions.members.cache.size > newMessage.mentions.members.cache.size) {
                
                const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#00ADEF")
                                .setTitle(`📝 Ghostping detectado`)
                                .setAuthor({ name: newMessage.author.username, iconURL: newMessage.author.displayAvatarURL() })
                                .setDescription(oldMessage.content ?? '> `Sin contenido en el mensaje.`')
                                .setTimestamp()
                        ]
                    }).catch(() => {});

                    if (_guild.moderation.automoderator?.enable && _guild.moderation.automoderator.events.ghostping) {
                        await automoderator(client, _guild, oldMessage, 'Menciones fantasmas.');
                    }
                }
            } else {
                const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#00ADEF")
                                .setTitle("📝 Mensaje editado")
                                .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
                                .setDescription('`(Mostrando mensaje antes de editar)`\n ' + 
                                    (oldMessage.content || '> `Sin contenido en el mensaje.`') + 
                                    '\n\n`(Mostrando mensaje después de editar)` \n' + 
                                    (newMessage.content || '> `Sin contenido en el mensaje.`'))
                                .addFields(
                                    { name: 'En el canal:', value: `<#${newMessage.channel.id}>`, inline: true },
                                    { name: 'Bot:', value: `\`${newMessage.author.bot}\``, inline: true }
                                )
                                .setTimestamp()
                        ]
                    }).catch(err => {
                        if (err.code === 50035) {
                            logChannel.send({ content: '`Error 004`: Message so long!' }).catch(() => {
                                _guild.configuration.logs = [];
                                updateDataBase(client, newMessage.guild, _guild, true);
                            });
                        }
                    });
                }
            }
        }

        if (!newMessage.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            for (const badword of _guild.moderation.dataModeration.badwords) {
                if (newMessage.content.toLowerCase().includes(badword)) {
                    const reply = await newMessage.reply({ 
                        content: `¡La palabra \`${badword}\` está prohibida!` 
                    });
                    
                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);
                    break;
                }
            }

            if (_guild.moderation.dataModeration?.events?.manyPings) {
                if (newMessage.content.split('@').length - 1 >= _guild.moderation.automoderator.actions.manyPings) {
                    const reply = await newMessage.reply({ 
                        content: '¡No hagas tantas menciones!' 
                    });

                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);

                    if (_guild.moderation.automoderator?.enable && 
                        _guild.moderation.automoderator.events.manyPings) {
                        await automoderator(client, _guild, newMessage, 'Demasiadas menciones en un mismo mensaje.');
                    }
                }
            }

            if (_guild.moderation.dataModeration?.events?.capitalLetters && newMessage.content.length >= 6) {
                let capitalCount = 0;
                const mayus = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
                
                for (const char of newMessage.content) {
                    if (mayus.includes(char)) capitalCount++;
                }

                if (capitalCount >= newMessage.content.length / 2) {
                    const reply = await newMessage.reply({ 
                        content: '¡No escribas tantas mayúsculas!' 
                    });

                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);

                    if (_guild.moderation.automoderator?.enable && 
                        _guild.moderation.automoderator.events.capitalLetters) {
                        await automoderator(client, _guild, newMessage, 'Muchas mayúsculas en un mismo mensaje.');
                    }
                }
            }

            if (_guild.moderation.dataModeration?.events?.manyEmojis) {
                if (newMessage.content.split('<:').length - 1 >= _guild.moderation.automoderator.actions.manyEmojis) {
                    const reply = await newMessage.reply({ 
                        content: 'No puedes escribir tantos emojis.' 
                    });

                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);

                    if (_guild.moderation.automoderator?.enable && 
                        _guild.moderation.automoderator.events.manyEmojis) {
                        await automoderator(client, _guild, newMessage, 'Demasiados emojis en un mismo mensaje.');
                    }
                }
            }

            if (_guild.moderation.dataModeration?.events?.manyWords) {
                if (newMessage.content.length >= _guild.moderation.automoderator.actions.manyWords) {
                    const reply = await newMessage.reply({ 
                        content: 'Escribe como máximo 250 caracteres.' 
                    });

                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);

                    if (_guild.moderation.automoderator?.enable && 
                        _guild.moderation.automoderator.events.manyWords) {
                        await automoderator(client, _guild, newMessage, 'Mensajes muy largos.');
                    }
                }
            }

            if (_guild.moderation.dataModeration?.events?.linkDetect) {
                if (newMessage.content.includes('http') || newMessage.content.includes('.gg')) {
                    let isAllowedLink = false;
                    for (const allowedLink of _guild.moderation.automoderator.actions.linksToIgnore) {
                        if (newMessage.content.includes(allowedLink)) {
                            isAllowedLink = true;
                            break;
                        }
                    }

                    if (!isAllowedLink) {
                        const reply = await newMessage.reply({ 
                            content: '¡No hagas spam!' 
                        });

                        setTimeout(async () => {
                            await Promise.all([
                                newMessage.delete().catch(() => {}),
                                reply.delete().catch(() => {})
                            ]);
                        }, 2000);

                        if (_guild.moderation.automoderator?.enable && 
                            _guild.moderation.automoderator.events.linkDetect) {
                            await automoderator(client, _guild, newMessage, 'Publicar enlaces.');
                        }
                    }
                }
            }

            if (_guild.moderation.dataModeration?.events?.iploggerFilter && newMessage.content.includes('http')) {
                const links = newMessage.content.split(' ').filter(word => word.includes('http'));
                const link = links[0] || newMessage.content;

                if (await antiIpLogger(link)) {
                    const reply = await newMessage.reply({ 
                        content: '¡Ese link contiene un iplogger!' 
                    });

                    setTimeout(async () => {
                        await Promise.all([
                            newMessage.delete().catch(() => {}),
                            reply.delete().catch(() => {})
                        ]);
                    }, 2000);

                    if (_guild.moderation.automoderator?.enable && 
                        _guild.moderation.automoderator.events.iploggerFilter) {
                        await automoderator(client, _guild, newMessage, 'Enviar iploggers.');
                    }
                }
            }
        }

        await updateDataBase(client, newMessage.guild, _guild, true);

    } catch (err) {
        console.error('Error en messageUpdate:', err);
    }

    if (await ratelimitFilter(newMessage)) {
        _guild = await Guild.findOne({ id: newMessage.guild.id });
    }
};