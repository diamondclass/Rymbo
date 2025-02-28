const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Timers = require('../schemas/timersSchema');
const { setGuildBase } = require('../databaseManager');
const Blacklist = require('../schemas/blacklist');
const { version } = require("../package-lock.json");

module.exports = async (client, guild) => {
    try {
        if (guild) {
            await setGuildBase(guild);
            const logChannel = client.channels.cache.get("1277357469076815912");
            let founder = await client.users.fetch(guild.ownerId);
            if (!founder) {
                console.error(`No se pudo obtener el fundador con ID ${guild.ownerId}`);
                return;
            }
            if (guild.memberCount < 15) {
                await founder.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('¡Atención! El servidor debe tener al menos 15 miembros.')
                        .setDescription(`El servidor **${guild.name}** tiene solo **${guild.memberCount} miembros**.
Para añadir el bot, debe haber al menos 15 miembros en el servidor.`)
                        .setColor("#FF0000")
                        .setTimestamp()
                    ]
                }).catch(err => console.error('Error enviando el mensaje a fundador por pocos miembros:', err));
                await guild.leave().catch(err => console.error('Error dejando el servidor:', err));
                return;
            }
            if (logChannel) {
                logChannel.send({
                    embeds: [new EmbedBuilder()
                        .setThumbnail(guild.iconURL())
                        .setTitle('Nuevo Servidor.')
                        .setDescription(`Servidor: ${guild.name} (${guild.id})
Fundador: ${founder.tag} (${founder.id})
Idioma: ${guild.preferredLocale}
Roles: ${guild.roles.cache.size}
Miembros: ${guild.memberCount}`)
                        .setTimestamp()
                        .setColor("#00ADEF")
                        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                    ]
                }).catch(err => console.error('Error enviando el log del nuevo servidor:', err));
            }
            const myUserId = "1216532655592439862";
            const user = await client.users.fetch(myUserId);
            if (user) {
                user.send({
                    embeds: [new EmbedBuilder()
                        .setThumbnail(guild.iconURL())
                        .setTitle('Nuevo Servidor.')
                        .setDescription(`Servidor: ${guild.name} (${guild.id})
Fundador: ${founder.tag} (${founder.id})
Idioma: ${guild.preferredLocale}
Roles: ${guild.roles.cache.size}
Miembros: ${guild.memberCount}`)
                        .setTimestamp()
                        .setColor("#00ADEF")
                        .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                    ]
                }).catch(err => console.error('Error enviando el MD a ti:', err));
            }
            let blockedUser = await Blacklist.findOne({ userId: guild.ownerId });
            if (blockedUser) {
                founder.send({
                    embeds: [new EmbedBuilder()
                        .setTitle('Has sido baneado')
                        .setDescription(`Has sido baneado del servidor **${guild.name}** debido a estar en la blacklist.`)
                        .setColor("#FF0000")
                        .setTimestamp()
                    ]
                }).catch(err => console.error('Error enviando el mensaje de blacklist al fundador:', err));
                await guild.leave().catch(err => console.error('Error dejando el servidor:', err));
            } else {
                const inviteChannel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText);
                if (inviteChannel) {
                    inviteChannel.createInvite({ maxAge: 0, maxUses: 0 })
                        .then(invite => {
                            const welcomeEmbed = new EmbedBuilder()
                                .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
                                .setDescription(`Rymbo, versión ${version}

¡Gracias por invitarme! Te animo a probar comandos como \`r!ayuda\` o incluso hacerme tag para obtener información sobre mí.

Invitación para compartir: ${invite.url}
> <:windows_security:1277361559114481715> A partir de ahora, serás protegido.
> <:Cyan_crown:1279260496872345694> Serás tratado como un rey
> <:Cashapp:1279260668314517526> ¡Y todo **gratis**!

**Anuncios**
> <:Verified_Seagull:1279260683904749628> ¡Buscamos la verificación! Ayúdanos a mejorar y verificar.
> <:Partner_Seagull:1279260613956075623> ¿Quieres ser Partner? Únete a nuestro [soporte](https://discord.gg/a7FqNnHk2m) y habla con los staff.

<a:a_moderation:953183975583670302> **AVISO DE SEGURIDAD:** Instamos que le den el rol más alto al bot, si necesitan poner a alguien en whitelist, utilicen **r!whitelist**, pero después pasa que raidean el servidor y el bot no puede hacer nada.`)
                                .setColor("#00ADEF")
                                .setImage("https://cdn.discordapp.com/attachments/1313338210642034738/1313338281655795733/Untitled_Project7.jpg?ex=67506dd6&is=674f1c56&hm=43b1efa469e30265b0f15d28e9db493c6cc5528a0d80e091362e73efa96a89f4&");
                            founder.send({ embeds: [welcomeEmbed] })
                                .catch(err => console.error('Error enviando el mensaje de bienvenida al fundador:', err));
                            const textChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages));
                            if (textChannels.size > 0) {
                                const randomChannel = textChannels.random();
                                randomChannel.send({ embeds: [welcomeEmbed] })
                                    .catch(err => console.error('Error enviando el embed a un canal aleatorio:', err));
                            } else {
                                console.error('No se encontraron canales de texto donde el bot pueda enviar mensajes.');
                            }
                        })
                        .catch(err => console.error('Error creando la invitación:', err));
                } else {
                    console.error('No se encontró un canal de texto para crear la invitación.');
                }
            }
            setTimeout(async () => {
                if (blockedUser) {
                    if (blockedUser.serversCreated.date !== new Date().getDay()) {
                        blockedUser.serversCreated = {
                            servers: 1,
                            date: new Date().getDay()
                        };
                    } else if (blockedUser.serversCreated.servers >= 3) {
                        founder.send('¡Para el carro colega! Hoy ya me has añadido en tres servidores, me podrás añadir mañana.').catch(err => console.error('Error enviando el mensaje de límite alcanzado:', err));
                        guild.leave();
                    } else {
                        blockedUser.serversCreated.servers += 1;
                    }
                    blockedUser.save().catch(err => console.error('Error guardando los datos del usuario:', err));
                }
            }, 3000);
        }
    } catch (err) {
        console.error('Error manejando el evento guildCreate:', err);
    }
};
