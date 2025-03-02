const fs = require('fs');
const { package, version } = require('./package.json');
const axios = require('axios');
const { Client, GatewayIntentBits, Partials, Collection, Options, AuditLogEvent } = require('discord.js');
const client = new Client({
    shards: 'auto',
    makeCache: Options.cacheWithLimits({
        ApplicationCommandManager: 0,
        BaseGuildEmojiManager: 0,
        ChannelManager: Infinity,
        GuildChannelManager: Infinity,
        GuildBanManager: Infinity,
        GuildInviteManager: 0,
        GuildManager: Infinity,
        GuildMemberManager: Infinity,
        GuildStickerManager: 0,
        GuildScheduledEventManager: 0,
        MessageManager: Infinity,
        PermissionOverwriteManager: Infinity,
        PresenceManager: 0,
        ReactionManager: 0,
        ReactionUserManager: 0,
        RoleManager: Infinity,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        UserManager: Infinity,
        cacheGuilds: true,
        cacheChannels: true,
        cacheOverwrites: true,
        cacheRoles: true,
        cacheMembers: true,
        VoiceStateManager: Infinity
    }),
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildScheduledEvents
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.GuildScheduledEvent, Partials.Message, Partials.Reaction, Partials.User]
});
const colors = {
    success: "\x1b[32m",
    info: "\x1b[34m",
    reset: "\x1b[0m"
};

const mongoose = require('mongoose');
mongoose.connect("YOUR MONGO DATABASE HERE", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`${colors.success}[SUCCESS]${colors.reset} Conectado a mongoose.`);
}).catch(err => console.log(err));
const { cacheManager, cacheManagerDatabase } = require('./cacheManager');
client.super = {
    cache: new cacheManager('utils'),
    staff: new cacheManager('staff')
};
client.database = {
    guilds: new cacheManager('guilds', {}, false),
    users: new cacheManagerDatabase(client, 'u')
  };
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
        try {
            const fetchedLogs = await newGuild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.GuildUpdate
            });
            const auditLog = fetchedLogs.entries.first();
            if (!auditLog) return;
            const { executor } = auditLog;
            if (!executor.bot || executor.id === client.user.id) return;
            const owner = await newGuild.fetchOwner();
            const infoMessage = `🚨 **Alerta de Seguridad**\nEl bot ${executor.tag} (${executor.id}) ha cambiado el nombre del servidor\nDe: ${oldGuild.name}\nCambió a: ${newGuild.name}`;
            try {
                await owner.send(infoMessage);
                await newGuild.members.ban(executor.id, {
                    reason: 'Bot detectado cambiando el nombre del servidor'
                });
                console.log(`${colors.success}[SUCCESS]${colors.reset} Bot baneado por cambiar nombre del servidor:`, executor.tag);
                await newGuild.setName(oldGuild.name);
                console.log(`${colors.success}[SUCCESS]${colors.reset} Nombre del servidor revertido a:`, oldGuild.name);
            } catch (error) {
                console.error('Error al procesar la detección del bot:', error);
            }
        } catch (error) {
            console.error('Error en el evento guildUpdate:', error);
        }
    }
});
client.login("YOUR BOT TOKEN").then(async () => {
    console.clear();
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}                                                       ████████████████████████████████`);
    console.log(`${colors.info}                                                       █▄─▄▄▀█▄─█─▄█▄─▀█▀─▄█▄─▄─▀█─▄▄─█`);
    console.log(`${colors.info}                                                       ██─▄─▄██▄─▄███─█▄█─███─▄─▀█─██─█`);
    console.log(`${colors.info}                                                       ▀▄▄▀▄▄▀▀▄▄▄▀▀▄▄▄▀▄▄▄▀▄▄▄▄▀▀▄▄▄▄▀`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.reset}                                       ${version} | ${client.guilds.cache.size} servers | ${client.user.tag} (${client.user.id})`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);
    console.log(`${colors.info}`);

    client.comandos = new Collection();
    for (const file of fs.readdirSync('./eventos/')) {
        if (file.endsWith('.js')) {
            let fileName = file.substring(0, file.length - 3);
            let fileContents = require(`./eventos/${file}`);
            client.on(fileName, fileContents.bind(null, client));
            delete require.cache[require.resolve(`./eventos/${file}`)];
        }
    }
    console.log(`${colors.success}[SUCCESS]${colors.reset} Loaded events`);
    for (const subcarpeta of fs.readdirSync('./slash/')) {
        for (const file of fs.readdirSync('./slash/' + subcarpeta)) {
            if (file.endsWith(".js")) {
                let fileName = file.substring(0, file.length - 3);
                let fileContents = require(`./slash/${subcarpeta}/${file}`);
                client.comandos.set(fileName, fileContents);
            }
        }
    }
    client.slashCommands = new Collection();
    const slashFolders = fs.readdirSync('./slash');
    for (const folder of slashFolders) {
        const slashFiles = fs.readdirSync(`./slash/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of slashFiles) {
            const command = require(`./slash/${folder}/${file}`);
            client.slashCommands.set(command.data.name, command);
        }
    }
    console.log(`${colors.success}[SUCCESS]${colors.reset} Loaded slash commands`);
    const slashCommandsData = Array.from(client.slashCommands.values())
    .map(cmd => cmd.data.toJSON());


    await client.application.commands.set(slashCommandsData)
    .then(() => console.log(`${colors.success}[SUCCESS]${colors.reset} Slash commands registrados globalmente`))
    .catch(console.error);

    client.on('interactionCreate', async interaction => {
        if (!interaction.isCommand()) return;
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ Error al ejecutar el comando',
                ephemeral: true
            });
        }
    });
});
setTimeout(() => {
    console.log(`${colors.info}[INFO]${colors.reset} Bot created by zHypeado | Rymbo © All rights reserved`);
}, 2000);
process.on('unhandledRejection', (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
});
process.on('uncaughtException', (error) => {
    console.error("Uncaught Exception:", error);
});
