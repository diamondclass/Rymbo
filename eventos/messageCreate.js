const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { version } = require('../package.json');
const Guild = require('../schemas/guildsSchema');
const Support = require('../schemas/supportSchema');
const { automoderator, fecthDataBase, updateDataBase, fecthUsersDataBase, updateUsersDataBase, getResponseAndDelete } = require('../functions');
const mayus = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ms = require('ms');
const antiIpLogger = require("anti-ip-logger");

module.exports = async (client, message) => {
  if (!message.guild) return;
  if (!message.guild.available) return;
  if (!message.author || !message.author.id) return;
  if (message.partial) await message.fetch();
  let _guild = await fecthDataBase(client, message.guild, false);
  if (!_guild) return message.reply('Hubo un error en la base de datos.');
  if (message.webhookId) {
    try {
      if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
        if (_guild.protection.purgeWebhooksAttacks.enable) {
          client.super.cache.up(message.guild.id, cache);
          if (cache.amount >= 4) {
            message.channel.fetchWebhooks().then(async webhooks => {
              webhooks.forEach(webhook => {
                if (webhook.id === message.webhookId) {
                  if (_guild.configuration.whitelist.includes(webhook.owner.id)) return;
                  webhook.delete().then(async () => {
                    message.channel.send(`He eliminado el webhook \`${webhook.name}\`, creado por \`${webhook.owner.username}#${webhook.owner.discriminator}\`. Envió muchos mensajes a la vez.`);
                    if (_guild.protection.purgeWebhooksAttacks.rememberOwners === webhook.owner.id) {
                      if (message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
                        message.guild.members.ban(webhook.owner, { reason: 'Raid con webhooks.' }).catch(() => {});
                        message.channel.send({ content: 'También lo he baneado por crear 4 veces un webhook raider.' });
                      }
                    } else {
                      _guild.protection.purgeWebhooksAttacks.rememberOwners = webhook.owner.id;
                    }
                  }).catch(err => {
                    console.error(`Error al eliminar webhook: ${err}`);
                  });
                }
              });
            });
          }
          updateDataBase(client, message.guild, _guild);
          setTimeout(() => {
            client.super.cache.down(message.guild.id, cache);
          }, 3000);
        }
      }
    } catch (err) {
      console.error(`Error en el manejo de webhooks: ${err}`);
    }
    return;
  }
  const botAlerts = new Map();
  if (message.author.bot && _guild.protection.antiraid.enable && message.member.moderatable) {
    const raidKeywords = ['raided', 'pwned', 'hacked', 'clowned', '@everyone', 'discord.gg', 'squad', ''];
    const MAX_KEYWORDS = 3;
    const MAX_MENTIONS = 5;
    const SPAM_TIMEFRAME = 5000;
    const newMessage = message.content.toLowerCase();
    const countKeywords = (msgContent, keywords) =>
      keywords.reduce((count, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return count + (regex.test(msgContent) ? 1 : 0);
      }, 0);
    const hasRepeatedMessages = () =>
      message.channel.messages.cache.filter(
        msg =>
          msg.author.id === message.author.id &&
          msg.createdTimestamp > Date.now() - SPAM_TIMEFRAME &&
          msg.content === message.content
      ).size >= 3;
    const detectedKeywords = countKeywords(newMessage, raidKeywords);
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (detectedKeywords >= MAX_KEYWORDS || mentionCount >= MAX_MENTIONS || hasRepeatedMessages()) {
      const alertCount = (botAlerts.get(message.author.id) || 0) + 1;
      botAlerts.set(message.author.id, alertCount);
      const reason = `
        - Palabras clave detectadas: ${detectedKeywords}
        - Menciones: ${mentionCount}
        - Mensajes repetidos: ${hasRepeatedMessages() ? 'Sí' : 'No'}
        `;
      const alertEmbed = {
        color: "#f0f0f0",
        title: '⚠️ Alerta de actividad sospechosa de un bot',
        description: `El bot **${message.author.tag}** (${message.author.id}) ha sido marcado.`,
        fields: [
          { name: 'Razón', value: reason.trim() },
          { name: 'Alerta número', value: `${alertCount}`, inline: true },
          { name: 'Servidor', value: `${message.guild.name} (${message.guild.id})`, inline: true }
        ],
        timestamp: new Date()
      };
      const owner = await message.guild.fetchOwner();
      message.channel.send({ embeds: [alertEmbed] });
      owner.send({ embeds: [alertEmbed] }).catch(err => console.error(`No se pudo enviar mensaje al fundador: ${err}`));
      const logChannelId = '1277357469076815912';
      const logGuildId = '1277353130518122538';
      const logGuild = client.guilds.cache.get(logGuildId);
      const logChannel = logGuild?.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = {
          color: "#f0f0f0",
          title: '📜 ALERTA DE POSIBLE RAID',
          description: `@everyone\nSe ha detectado actividad sospechosa de un bot en el servidor **${message.guild.name}**.`,
          fields: [
            { name: 'Servidor', value: `${message.guild.name} (${message.guild.id})` },
            { name: 'Bot', value: `${message.author.tag} (${message.author.id})` },
            { name: 'Razón', value: reason.trim() },
            { name: 'Alerta número', value: `${alertCount}`, inline: true }
          ],
          timestamp: new Date()
        };
        logChannel.send({ embeds: [logEmbed] });
      } else {
        console.error('No se pudo encontrar el canal de logs.');
      }
      if (alertCount === 2) {
        const sensitivePermissions = [
          PermissionFlagsBits.Administrator,
          PermissionFlagsBits.ManageGuild,
          PermissionFlagsBits.ManageRoles,
          PermissionFlagsBits.ManageWebhooks,
          PermissionFlagsBits.CreateInstantInvite,
          PermissionFlagsBits.ManageChannels
        ];
        const updatedPermissions = message.member.permissions.toArray().filter(perm => !sensitivePermissions.includes(perm));
        await message.member.roles.cache.forEach(role => {
          role.setPermissions(updatedPermissions).catch(err => console.error(`Error al modificar permisos: ${err}`));
        });
        const revokeEmbed = {
          color: "#f0f0f0",
          title: '⚠️ Permisos Eliminados',
          description: `Se han revocado permisos sensibles del bot **${message.author.tag}**.`,
          timestamp: new Date()
        };
        message.channel.send({ embeds: [revokeEmbed] });
      }
      if (alertCount >= 3) {
        message.member.ban({ reason: `Sospecha de raid detectada tras múltiples alertas. Razón: ${reason}` }).then(() => {
          const banEmbed = {
            color: "#f0f0f0",
            title: '🚨 Bot Baneado',
            description: `El bot **${message.author.tag}** ha sido expulsado por actividad sospechosa.`,
            timestamp: new Date()
          };
          message.channel.send({ embeds: [banEmbed] });
          if (logChannel) {
            logChannel.send({ content: '@everyone', embeds: [banEmbed] });
          }
        }).catch(err => console.error(`Error al intentar banear al bot: ${err}`));
      }
    }
  }
  if (_guild.protection.antiraid.enable && _guild.moderation.dataModeration.events.linkDetect) {
    const adminPermissions = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild];
    const isAdmin = message.member.permissions.has(adminPermissions);
    const linkWhitelist = [
      'tenor.com',
      'giphy.com',
      'discord.com',
      'discordapp.com',
      'cdn.discordapp.com',
      'media.discordapp.net',
      'imgur.com',
      ..._guild.moderation.automoderator.actions.linksToIgnore
    ];
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const detectedLinks = message.content.match(linkRegex) || [];
    if (detectedLinks.length > 0 && !message.author.bot && !isAdmin) {
      let hasUnauthorizedLink = false;
      for (const link of detectedLinks) {
        try {
          const url = new URL(link);
          const domain = url.hostname.replace('www.', '');
          if (!linkWhitelist.some(allowed => domain.includes(allowed))) {
            hasUnauthorizedLink = true;
            break;
          }
        } catch (e) {
          hasUnauthorizedLink = true;
          break;
        }
      }
      if (hasUnauthorizedLink) {
        const reply = await message.reply({ content: '¡Los enlaces están restringidos en este servidor!' });
        setTimeout(async () => {
          await Promise.all([message.delete().catch(() => {}), reply.delete().catch(() => {})]);
        }, 2000);
        if (_guild.moderation.automoderator.enable) {
          await automoderator(client, _guild, message, 'Envío de enlaces no permitidos');
        }
        console.log(`[Antilink] Bloqueado en ${message.guild.name} | Usuario: ${message.author.tag} | Contenido: ${message.content}`);
        return;
      }
    }
  }
  if (_guild.protection.antiraid.enable && message.member.moderatable) {
    const newMessage = message.content.toLowerCase();
    const scamKeywords = ['free', 'steam', 'nitro', 'gift', 'promo', 'hack', 'giveaway'];
    const matchedKeywords = scamKeywords.filter(keyword => newMessage.includes(keyword));
    const hasMultipleScamKeywords = matchedKeywords.length >= 2 && newMessage.includes('http');
    if (hasMultipleScamKeywords) {
      try {
        await message.member.timeout(ms('7d'), 'Usuario sospechoso de distribuir nitro falso y contenido no deseado.');
        await message.delete();
        message.reply({
          content: `⚠️ **Alerta de seguridad**: Un usuario sospechoso ha sido detectado ofreciendo **nitro falso** o enlaces maliciosos en el servidor (ID: ${message.author.id}). El usuario ha sido **mutado** durante 7 días. Acciones adicionales serán tomadas si persiste.`
        });
        const owner = await message.guild.fetchOwner();
        const ownerMessage = `⚠️ **Alerta de seguridad**: El usuario **${message.author.tag}** (${message.author.id}) fue detectado enviando un mensaje con contenido sospechoso en el servidor **${message.guild.name}**. El mensaje incluía:\n\n"${message.content}"\n\nEl usuario ha sido **mutado durante 7 días** debido a esto.`;
        await owner.send(ownerMessage);
      } catch (e) {
        console.error('Error al poner timeout al usuario:', e);
      }
    }
  }
  if (message.author.bot) return;
  async function ping() {
    const img = message.mentions.users.first();
    if (!img) return;
    if (img.id === client.user.id) {
      if (_guild.configuration.subData.pingMessage === 'allDetails') {
        let totalSeconds = client.uptime / 1000;
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#FCFDFF")
              .setDescription(`Rymbo ${version} es un bot basado en [SPAgency](https://github.com/devEthan6737/SPAgency).
              
  <a:a_secure:953907590004355103> **Un bot __Antiraid__ eficiente para proteger a tu servidor, comunidad o empresa.**
  <:uo_next:955381240293392445> *Usá r!ayuda para comenzar*
              
  <a:a_Filter:953182746182828042> Llevo encendido **${days} días**, **${hours} horas**, **${minutes} minutos** y **${seconds} segundos**, además de que me reinicio seguido para lanzar mis actualizaciones.
              
  <:emote:992383379024650341> Puedes invitarme dando [click aquí](https://discord.com/oauth2/authorize?client_id=1277124708369961021&permissions=8&integration_type=0&scope=bot+applications.commands), recomendamos entrar a nuestro soporte.`)
              .setFooter({ text: 'Rymbo' })
              .setImage("https://cdn.discordapp.com/attachments/1313338210642034738/1329266812734541959/rymbo-banner.jpg?ex=6789b7b0&is=67886630&hm=700c59c8b854cda34aa8bd1da5bf427032ad98d21408db1a9f22c33573c83be3&")
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setLabel('Soporte oficial')
                .setEmoji('⚙')
                .setURL('https://discord.gg/a7FqNnHk2m')
                .setStyle('Link'),
              new ButtonBuilder()
                .setLabel('Sponsor: CoreX Hosting')
                .setEmoji('⚔')
                .setURL('https://corexhosting.net')
                .setStyle('Link')
            )
          ]
        });
      } else if (_guild.configuration.subData.pingMessage === 'pingLessDetails') {
        message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FCFDFF")
              .addFields({ name: 'Si necesitas mi ayuda, puedes usar comandos como: comandos, invite, ayuda**' })
              .setFooter({ text: 'Rymbo' })
          ]
        });
      } else if (_guild.configuration.subData.pingMessage === 'onlySupportServer') {
        message.reply({ content: '¡Aqui estoy para ayudarte!' });
      }
      return;
    }
  }
  ping();
  let cache = await client.super.cache.get(message.author.id, true);
  try {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      for (const x of _guild.moderation.dataModeration.badwords) {
        if (message.content.toLowerCase().includes(x)) {
          message.reply({ content: `¡La palabra ${x} está prohibida!` }).then(replyMsg => {
            setTimeout(() => {
              message.delete().catch(() => {});
              replyMsg.delete();
            }, 2000);
          });
          if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.badwordDetect === true) {
            await automoderator(client, _guild, message, 'Malas palabras.');
          }
        }
      }
      if (_guild.protection.antiflood === true) {
        if (cache.amount >= _guild.moderation.automoderator.actions.basicFlood) {
          message.channel.send({ content: `¡Deja de hacer flood <@${message.author.id}>!` });
          if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.floodDetect === true) {
            await automoderator(client, _guild, message, 'Flood.');
          }
        } else {
          client.super.cache.up(message.author.id, cache);
          setTimeout(() => {
            client.super.cache.down(message.author.id, cache);
          }, 3000);
        }
      }
      if (_guild.moderation.dataModeration.events.manyPings === true) {
        if (message.content.split('@').length - 1 >= _guild.moderation.automoderator.actions.manyPings) {
          message.reply({ content: '¡No hagas tantas menciones!' }).then(async replyMsg => {
            setTimeout(() => {
              replyMsg.delete();
              message.delete().catch(() => {});
            }, 2000);
            if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.manyPings === true) {
              await automoderator(client, _guild, message, 'Demasiadas menciones en un mismo mensaje.');
            }
          });
        }
      }
      if (_guild.moderation.dataModeration.events.capitalLetters === true) {
        if (message.content.length >= 6) {
          let contar = 0;
          for (let i = 0; i < mayus.length; i++) {
            for (let j = 0; j < message.content.length; j++) {
              if (message.content[j] === mayus[i]) {
                contar++;
              }
            }
          }
          if (contar >= message.content.length / 2) {
            message.reply({ content: '¡No escribas tantas mayúsculas!' }).then(async replyMsg => {
              setTimeout(() => {
                replyMsg.delete();
                message.delete().catch(() => {});
              }, 2000);
              if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.capitalLetters === true) {
                await automoderator(client, _guild, message, 'Muchas mayúsculas en un mismo mensaje.');
              }
            });
          }
        }
      }
      if (_guild.moderation.dataModeration.events.manyEmojis === true) {
        const emojiCount1 = message.content.split('<:').length - 1;
        const emojiCount2 = message.content.split(/\p{Emoji}/u).length - 1;
        if (!message.content.includes('@') && (emojiCount1 >= _guild.moderation.automoderator.actions.manyEmojis || emojiCount2 >= _guild.moderation.automoderator.actions.manyEmojis) && emojiCount2 !== 18) {
          message.reply({ content: 'No puedes escribir tantos emojis.' }).then(async replyMsg => {
            setTimeout(() => {
              replyMsg.delete();
              message.delete().catch(() => {});
            }, 2000);
            if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.manyEmojis === true) {
              await automoderator(client, _guild, message, 'Demasiados emojis en un mismo mensaje.');
            }
          });
        }
      }
      if (_guild.moderation.dataModeration.events.manyWords === true) {
        if (message.content.length >= _guild.moderation.automoderator.actions.manyWords) {
          message.reply({ content: 'Escribe como máximo 250 caracteres.' }).then(async replyMsg => {
            setTimeout(() => {
              replyMsg.delete();
              message.delete().catch(() => {});
            }, 2000);
            if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.manyWords === true) {
              await automoderator(client, _guild, message, 'Mensajes muy largos.');
            }
          });
        }
      }
      if (_guild.moderation.dataModeration.events.iploggerFilter === true && message.content.includes('http')) {
        const originalContent = message.content;
        let words = message.content.split(' ');
        let links = words.filter(word => word.includes('http'));
        message.content = links[0] ? links[0] : originalContent;
        if (await antiIpLogger(message.content)) {
          message.reply({ content: '¡Ese link contiene un iplogger!' }).then(async replyMsg => {
            setTimeout(() => {
              replyMsg.delete();
              message.delete().catch(() => {});
            }, 2000);
            if (_guild.moderation.automoderator.enable === true && _guild.moderation.automoderator.events.iploggerFilter === true) {
              await automoderator(client, _guild, message, 'Enviar iploggers.');
            }
          });
        }
      }
    }
    const afkCommand = require('../slash/Otros/afk');
    await afkCommand.handleMessage(client, message);
    if (_guild.protection.intelligentAntiflood === true) {
      if (message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        if (
          message.channel.name.includes('flood') ||
          (message.channel.topic &&
            message.channel.topic.includes('permite') &&
            message.channel.topic.includes('flood') &&
            !message.channel.topic.includes('no'))
        )
          return;
        if (message.content === cache.lastContent) {
          cache.lastContent = message.content;
          client.super.cache.up(message.author.id, cache);
          if (cache.amount >= 5) {
            client.super.cache.delete(message.author.id);
            message.guild.members.ban(message.author.id, { reason: 'Flood masivo.' }).then(async () => {
              message.channel.send('He baneado al usuario.');
            }).catch(() => {});
          }
          message.delete().catch(() => {});
          setTimeout(() => {
            client.super.cache.delete(message.author.id);
          }, 6100);
        } else {
          cache.lastContent = message.content;
          client.super.cache.post(message.author.id, cache);
        }
      }
    }
    if (_guild.protection.antiInfecteds.enable === true && message.member.moderatable) {
      let lowerMessage = message.content.toLowerCase();
      if (
        (lowerMessage.includes('free') ||
          lowerMessage.includes('steam') ||
          lowerMessage.includes('discord')) &&
        lowerMessage.includes('nitro') &&
        lowerMessage.includes('http')
      ) {
        message.member.timeout(ms('7d'), 'Usuario infectado.').then(() => {
          setTimeout(() => {
            message.delete();
          }, 2000);
          message.reply({ content: `Un usuario infectado ha aparecido regalando nitro falso en el servidor (${message.author.id}), lo he muteado una semana.` });
        }).catch(() => {});
      }
    }
    if (
      _guild.protection.raidmode.enable === true &&
      _guild.protection.raidmode.activedDate + ms(_guild.protection.raidmode.timeToDisable) <= Date.now()
    ) {
      _guild.protection.raidmode.enable = false;
      updateDataBase(client, message.guild, _guild);
      message.reply({ content: 'Raidmode fue desactivado: Ha expirado el tiempo establecido desde la activación.' });
    }
  } catch (err) {}
  if (_guild.configuration.password.enable && !_guild.configuration.password.usersWithAcces.includes(message.author.id)) {
    message.reply({ content: 'El sistema 2fa está activado. Después de este mensaje, escribe la contraseña para usar comandos.' });
    const collector = message.channel.createMessageCollector({ time: 30000 });
    collector.on('collect', m => {
      if (m.content === '') return;
      if (m.author.id === message.author.id) {
        if (m.content === _guild.configuration.password._password) {
          message.reply({ content: 'Contraseña correcta, has sido registrado con éxito. Vuelve a escribir el comando.' });
          _guild.configuration.password.usersWithAcces.push(message.author.id);
          m.delete();
          updateDataBase(client, message.guild, _guild, true);
          collector.stop();
        } else {
          message.reply({ content: 'Contraseña incorrecta.' });
          collector.stop();
        }
      }
    });
    return;
  }
};  
