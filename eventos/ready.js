const { Client, ActivityType, PermissionsBitField } = require('discord.js');
const Timers = require('../schemas/timersSchema');
const Guild = require('../schemas/guildsSchema');
const Blacklist = require('../schemas/blacklist');
const { pulk } = require('../functions');
const { version } = require('../package.json');

module.exports = async (client) => {
    const verificarBlacklist = async () => {
        const blacklistedUsers = await Blacklist.find({ removedAt: null });
        
        for (const guild of client.guilds.cache.values()) {
            const bots = guild.members.cache.filter(member => member.user.bot);
            
            for (const [botId, bot] of bots) {
                const isBlacklisted = blacklistedUsers.some(user => user.userId === botId);
                
                if (isBlacklisted) {
                    try {
                        if (guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                            await bot.ban({ reason: 'Bot en blacklist detectado' });
                            const logChannel = guild.channels.cache.find(c => c.name === 'logs');
                            if (logChannel) {
                                await logChannel.send(`Bot ${bot.user.tag} baneado por estar en blacklist.`);
                            }
                        }
                    } catch (err) {
                        console.error(`Error al banear bot ${botId} en servidor ${guild.id}:`, err);
                    }
                }
            }
        }
    };

    await client.guilds.cache.get("1277353130518122538").members.fetch();

    const estados = [
        `a ${client.guilds.cache.size} servidores`,
        '/ayuda',
        'LEER SOPORTE',
        'Sponsor: corexhosting.net',
        'la versión ' + version
    ];

    let indiceEstado = 0;

    const actualizarEstado = async () => {
        try {
            await client.user.setActivity({ name: estados[indiceEstado], type: ActivityType.Watching });
            indiceEstado = (indiceEstado + 1) % estados.length;
        } catch (err) {
            console.error("Error al establecer estado:", err);
        }
    };

    await actualizarEstado();
    setInterval(actualizarEstado, 10000);
    setInterval(verificarBlacklist, 600000);

    setTimeout(async () => {
        const _timers = await Timers.findOne({});
        if (!_timers?.servers) return;

        for (const serverId of _timers.servers) {
            if (typeof serverId !== 'string') continue;

            const _guild = await Guild.findOne({ id: serverId });
            if (!_guild) {
                _timers.servers = await pulk(_timers.servers, serverId);
                await _timers.save();
                continue;
            }

            for (const timer of _guild.moderation.dataModeration.timers) {
                if (Date.now() <= timer.endAt) continue;

                const guild = client.guilds.cache.get(serverId);
                if (!guild) continue;

                try {
                    if (timer.action === 'UNBAN') {
                        await guild.members.unban(timer.user.id);
                        const channel = client.channels.cache.get(timer.channel);
                        if (channel) {
                            await channel.send(`El usuario \`${timer.user.username}\` ha sido desbaneado después de \`${timer.inputTime}\`.`);
                        }
                    } else if (timer.action === 'UNMUTE') {
                        const member = guild.members.cache.get(timer.user.id);
                        if (member) {
                            await member.roles.remove(_guild.moderation.dataModeration.muterole);
                            for (const roleId of timer.user.roles) {
                                await member.roles.add(roleId).catch(console.error);
                            }
                            const channel = client.channels.cache.get(timer.channel);
                            if (channel) {
                                await channel.send(`El usuario \`${timer.user.username}\` ha sido desmuteado después de \`${timer.inputTime}\`.`);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error en timer ${timer.action}:`, err);
                }
            }
        }
    }, 60000);
};
