const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const Guild = require('../schemas/guildsSchema');
const Timers = require('../schemas/timersSchema');
const ms = require('ms');
const { pulk, fecthDataBase, updateDataBase } = require('../functions');
const Blacklist = require('../schemas/blacklist');

module.exports = async (client, member) => {
    client.users.fetch(member.guild.ownerId);
    let _guild = await fecthDataBase(client, member.guild, false);
    if (!_guild) return;
    async function sendOwnerMessage(title, description, fields) {
        const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle(title)
            .setDescription(description)
            .addFields(fields)
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });
        client.users.fetch(member.guild.ownerId).then(owner => {
            owner.send({ content: `LOG: ${title} en **${member.guild.name}**`, embeds: [embed] }).catch(() => {});
        });
    }
    try {
        if (_guild.configuration.logs && _guild.configuration.logs[0]) {
            const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor("#00ADEF")
                    .setTitle("Alguien ha entrado")
                    .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() })
                    .addFields({ name: "Persona:", value: `\`${member.user.username} (${member.user.id})\``, inline: true })
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    } catch (err) {
        if (_guild.configuration.logs && _guild.configuration.logs[1]) {
            const errorChannel = client.channels.cache.get(_guild.configuration.logs[1]);
            if (errorChannel) {
                await errorChannel.send({ content: `Error en logs (guildMemberAdd): ${err}` }).catch(() => {});
            }
        }
        _guild.configuration.logs = [];
    }
    try {
        const blacklistEntry = await Blacklist.findOne({ userId: member.user.id, removedAt: { $exists: false } });
        if (blacklistEntry) {
            const reason = blacklistEntry.reason ? blacklistEntry.reason.toString() : 'No se proporcionó una razón';
            if (member.guild.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                const embed = new EmbedBuilder()
                    .setTitle("Has sido baneado")
                    .setDescription(`**${member.user.tag}**, has sido baneado de **${member.guild.name}**.`)
                    .addFields({ name: "Razón", value: reason, inline: false })
                    .setColor("#FF0000")
                    .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() });
                const guildButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('server_name')
                        .setLabel(member.guild.name)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                await member.send({ embeds: [embed], components: [guildButton] }).catch(() => {});
                sendOwnerMessage(
                    'Usuario en blacklist intentó ingresar',
                    `El usuario \`${member.user.tag}\` intentó ingresar y está en la blacklist.`,
                    [{ name: "Razón", value: reason, inline: false }]
                );
                member.guild.members.ban(member, { reason: `Baneado por blacklist: ${reason}` }).catch(() => {});
            }
            return;
        }
    } catch (err) {
        console.error(`Error comprobando blacklist: ${err}`);
    }
    try {
        let cache = await client.super.cache.get(member.guild.id, true);
        if (_guild.protection && _guild.protection.antijoins && _guild.protection.antijoins.enable) {
            if (cache.remember && cache.remember.length > 0 && cache.remember.includes(member.user.id)) {
                if (member.guild.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    const embed = new EmbedBuilder()
                        .setDescription(`<:Alert:1278748088789504082> <@${member.user.id}> ha sido baneado de ingresar a **${member.guild.name}**.`)
                        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })
                        .setColor("#FF0000");
                    const guildButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('server_name')
                            .setLabel(member.guild.name)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await member.send({ embeds: [embed], components: [guildButton] }).then(() => {
                        member.guild.members.ban(member, { reason: `Antijoins activado.` }).catch(() => {});
                    }).catch(() => {
                        member.guild.members.ban(member, { reason: `Antijoins activado.` }).catch(() => {});
                    });
                    sendOwnerMessage(
                        'Usuario baneado por antijoins',
                        `El usuario \`${member.user.tag}\` ha sido baneado por antijoins.`,
                        [{ name: "Usuario", value: `<@${member.user.id}>`, inline: false }]
                    );
                    return;
                }
            }
        }
        if (member.user.bot) {
            const fetchedLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd });
            const botAddLog = fetchedLogs.entries.first();
            const inviter = botAddLog && botAddLog.target.id === member.user.id ? botAddLog.executor : null;
            const embedBotAdded = new EmbedBuilder()
                .setColor("#00ADEF")
                .addFields(
                    { name: "Lo invitó:", value: inviter ? `<@${inviter.id}>` : "Desconocido" },
                    { name: "Bot:", value: member.user.tag },
                    { name: "¿Verificado?:", value: member.user.flags.has(1 << 16) ? "Sí" : "No" },
                    { name: "¿Antibot activo?:", value: _guild.protection && _guild.protection.antibots && _guild.protection.antibots.enable ? "Sí" : "No" }
                );
            sendOwnerMessage(
                'Nuevo bot añadido',
                `Se ha añadido un nuevo bot a **${member.guild.name}**`,
                [
                    { name: "Bot", value: member.user.tag, inline: true },
                    { name: "Invitado por", value: inviter ? `<@${inviter.id}>` : "Desconocido", inline: true },
                    { name: "¿Verificado?", value: member.user.flags.has(1 << 16) ? "Sí" : "No", inline: true }
                ]
            );
            if (_guild.protection && _guild.protection.antibots && _guild.protection.antibots.enable) {
                if (_guild.protection.antibots._type === "all") {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        await member.guild.members.kick(member.user.id, `Antibots activado.`).catch(() => {});
                        sendOwnerMessage(
                            'Bot removido por antibots',
                            `El bot \`${member.user.tag}\` ha sido removido de **${member.guild.name}**`,
                            []
                        );
                    }
                } else if (_guild.protection.antibots._type === "only_nv" && !member.user.flags.has(65536)) {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        await member.guild.members.kick(member.user.id, `Antibots activado.`).catch(() => {});
                        sendOwnerMessage(
                            'Bot removido por antibots (no verificado)',
                            `El bot \`${member.user.tag}\` ha sido removido de **${member.guild.name}**`,
                            []
                        );
                    }
                } else if (_guild.protection.antibots._type === "only_v" && member.user.flags.has(65536)) {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        await member.guild.members.kick(member.user.id, `Antibots activado.`).catch(() => {});
                        sendOwnerMessage(
                            'Bot removido por antibots (verificado)',
                            `El bot \`${member.user.tag}\` ha sido removido de **${member.guild.name}**`,
                            []
                        );
                    }
                }
            }
        } else {
            if (_guild.protection && _guild.protection.antitokens && _guild.protection.antitokens.enable) {
                if (cache.amount > 3) {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers) && member.user.isToken === false) {
                        member.guild.members.kick(member, `Antitokens activado.`).catch(() => {});
                    }
                }
                for (let x of `${member.user.username}`.split(' ')) {
                    if (cache.remember && cache.remember.length > 0 && cache.remember.includes(x) && x !== "") {
                        if (member.guild.me.permissions.has(PermissionsBitField.Flags.BanMembers) && member.user.isToken === false) {
                            client.users.cache.get(member.user.id).send(`Has sido baneado por tokens.`).then(() => {
                                member.guild.members.ban(member, { reason: `Antitokens activado.` }).catch(() => {});
                            }).catch(() => {});
                        }
                    } else {
                        client.super.cache.push({ id: member.guild.id }, x);
                    }
                }
                if (_guild.protection.antitokens._type === "all") {
                    if (member.user.isToken) {
                        if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                            member.guild.members.kick(member, `Antitokens activado.`).catch(() => {});
                        }
                    }
                } else if (_guild.protection.antitokens._type === "only_nv" && !member.user.isToken) {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        member.guild.members.kick(member, `Antitokens activado.`).catch(() => {});
                    }
                } else if (_guild.protection.antitokens._type === "only_v" && member.user.isToken) {
                    if (member.guild.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        member.guild.members.kick(member, `Antitokens activado.`).catch(() => {});
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Error en el sistema de protección: ${err}`);
    }
};
