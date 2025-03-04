const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Guild = require('../../schemas/guildsSchema');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Muestra el estado de los sistemas de protección y configuración.'),
  async execute(interaction) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt == null;
      } catch (err) {
        return false;
      }
    }
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }

    const guildData = await Guild.findOne({ id: interaction.guild.id });
    if (!guildData) {
      return interaction.reply({ content: "No se pudo obtener la configuración del servidor.", ephemeral: true });
    }

    if (!guildData.protection) guildData.protection = {};
    if (!guildData.protection.antiraid) guildData.protection.antiraid = { enable: false, amount: 0, saveBotsEntrities: { authorOfEntry: '', _bot: '' } };
    if (!guildData.protection.antibots) guildData.protection.antibots = { enable: false, _type: '' };
    if (!guildData.protection.antitokens) guildData.protection.antitokens = { enable: false, usersEntrities: [], entritiesCount: 0 };
    if (!guildData.protection.antijoins) guildData.protection.antijoins = { enable: false, rememberEntrities: [] };
    if (!guildData.protection.markMalicious) guildData.protection.markMalicious = { enable: false, _type: '', rememberEntrities: [] };
    if (typeof guildData.protection.warnEntry !== 'boolean') guildData.protection.warnEntry = false;
    if (!guildData.protection.kickMalicious) guildData.protection.kickMalicious = { enable: false, rememberEntrities: [] };
    if (!guildData.protection.verification) guildData.protection.verification = { enable: false, _type: '', channel: '', role: '' };
    if (!guildData.protection.cannotEnterTwice) guildData.protection.cannotEnterTwice = { enable: false, users: [] };
    if (!guildData.protection.purgeWebhooksAttacks) guildData.protection.purgeWebhooksAttacks = { enable: false, amount: 5, rememberOwners: '' };
    if (typeof guildData.protection.intelligentAntiflood !== 'boolean') guildData.protection.intelligentAntiflood = false;
    if (typeof guildData.protection.antiflood !== 'boolean') guildData.protection.antiflood = false;
    if (!guildData.protection.bloqEntritiesByName) guildData.protection.bloqEntritiesByName = { enable: false, names: [] };
    if (!guildData.protection.bloqNewCreatedUsers) guildData.protection.bloqNewCreatedUsers = { time: '' };
    if (!guildData.protection.raidmode) guildData.protection.raidmode = { enable: false, timeToDisable: '', password: '', activedDate: 0 };
    if (!guildData.protection.antiwebhook) guildData.protection.antiwebhook = { enable: false, maxWebhooks: 5 };
    if (!guildData.protection.antichannels) guildData.protection.antichannels = { enable: false };
    if (!guildData.protection.antiInfecteds) guildData.protection.antiInfecteds = { enable: false };
    if (!guildData.protection.antiBotSpam) guildData.protection.antiBotSpam = { enable: false };
    if (!guildData.protection.IntelligentAntiflood) guildData.protection.IntelligentAntiflood = { enable: false };

    if (!guildData.configuration) guildData.configuration = { _version: '', whitelist: [], logs: [], ignoreChannels: [], password: { enable: false, _password: '', usersWithAcces: [] }, subData: { showDetailsInCmdsCommand: '', pingMessage: '', dontRepeatTheAutomoderatorAction: false } };

    const checkmark = "<:Checkmark:1278179814339252299>";
    const crossmark = "<:Crossmark:1278179784433864795>";

    const pages = [
      {
        title: "Protección - Básico",
        fields: [
          { name: "Antiraid", value: guildData.protection.antiraid.enable ? `${checkmark} (Amount: ${guildData.protection.antiraid.amount})` : crossmark, inline: true },
          { name: "Antibots", value: guildData.protection.antibots.enable ? `${checkmark} (Type: ${guildData.protection.antibots._type || "N/A"})` : crossmark, inline: true },
          { name: "Antitokens", value: guildData.protection.antitokens.enable ? `${checkmark} (Count: ${guildData.protection.antitokens.entritiesCount})` : crossmark, inline: true },
          { name: "Antijoins", value: guildData.protection.antijoins.enable ? checkmark : crossmark, inline: true },
          { name: "Mark Malicious", value: guildData.protection.markMalicious.enable ? `${checkmark} (${guildData.protection.markMalicious._type || "N/A"})` : crossmark, inline: true },
          { name: "Warn Entry", value: guildData.protection.warnEntry ? checkmark : crossmark, inline: true },
          { name: "Kick Malicious", value: guildData.protection.kickMalicious.enable ? checkmark : crossmark, inline: true }
        ]
      },
      {
        title: "Protección - Avanzado",
        fields: [
          { name: "Verification", value: guildData.protection.verification.enable ? `${checkmark} (Type: ${guildData.protection.verification._type || "N/A"}, Channel: ${guildData.protection.verification.channel || "N/A"}, Role: ${guildData.protection.verification.role || "N/A"})` : crossmark, inline: false },
          { name: "Cannot Enter Twice", value: guildData.protection.cannotEnterTwice.enable ? checkmark : crossmark, inline: true },
          { name: "Intelligent Antiflood", value: guildData.protection.intelligentAntiflood ? checkmark : crossmark, inline: true },
          { name: "Antiflood", value: guildData.protection.antiflood ? checkmark : crossmark, inline: true },
          { name: "Bloq Entrities By Name", value: guildData.protection.bloqEntritiesByName.enable ? `${checkmark} (${guildData.protection.bloqEntritiesByName.names.length} names)` : crossmark, inline: true },
          { name: "Bloq New Created Users", value: guildData.protection.bloqNewCreatedUsers.time ? `${checkmark} (Time: ${guildData.protection.bloqNewCreatedUsers.time})` : crossmark, inline: true }
        ]
      },
      {
        title: "Protección - Extras",
        fields: [
          { name: "Raidmode", value: guildData.protection.raidmode.enable ? `${checkmark} (Time: ${guildData.protection.raidmode.timeToDisable || "N/A"})` : crossmark, inline: true },
          { name: "Antiwebhook", value: guildData.protection.antiwebhook.enable ? `${checkmark} (Max: ${guildData.protection.antiwebhook.maxWebhooks})` : crossmark, inline: true },
          { name: "Antichannels", value: guildData.protection.antichannels.enable ? checkmark : crossmark, inline: true },
          { name: "AntiInfecteds", value: guildData.protection.antiInfecteds.enable ? checkmark : crossmark, inline: true },
          { name: "AntiBotSpam", value: (guildData.protection.antiBotSpam && guildData.protection.antiBotSpam.enable) ? checkmark : crossmark, inline: true },
          { name: "IntelligentAntiflood", value: (guildData.protection.IntelligentAntiflood && guildData.protection.IntelligentAntiflood.enable) ? checkmark : crossmark, inline: true }
        ]
      },
      {
        title: "Moderación",
        fields: [
          { name: "Mute Role", value: guildData.moderation.dataModeration.muterole || "N/A", inline: true },
          { name: "Force Reasons", value: guildData.moderation.dataModeration.forceReasons.length > 0 ? guildData.moderation.dataModeration.forceReasons.join(', ') : "N/A", inline: true },
          { name: "Timers", value: guildData.moderation.dataModeration.timers.length.toString(), inline: true },
          { name: "Badwords", value: guildData.moderation.dataModeration.badwords.length.toString(), inline: true },
          { name: "Automoderator", value: guildData.moderation.automoderator.enable ? checkmark : crossmark, inline: true },
          { name: "Auto-Action", value: guildData.moderation.automoderator.actions.action || "N/A", inline: true },
          { name: "Flood Detect", value: guildData.moderation.automoderator.actions.floodDetect.toString(), inline: true }
        ]
      },
      {
        title: "Configuración",
        fields: [
          { name: "Versión", value: guildData.configuration._version || "N/A", inline: true },
          { name: "Whitelist", value: guildData.configuration.whitelist.length > 0 ? guildData.configuration.whitelist.join(', ') : "N/A", inline: true },
          { name: "Logs", value: guildData.configuration.logs.length > 0 ? guildData.configuration.logs.join(', ') : "N/A", inline: true },
          { name: "Password Enabled", value: guildData.configuration.password.enable ? checkmark : crossmark, inline: true },
          { name: "SubData", value: `Details: ${guildData.configuration.subData.showDetailsInCmdsCommand || "N/A"} | Ping: ${guildData.configuration.subData.pingMessage || "N/A"}`, inline: false }
        ]
      }
    ];

    let page = 0;
    const embed = new EmbedBuilder()
      .setColor("#00ADEF")
      .setTitle(pages[page].title)
      .addFields(pages[page].fields)
      .setFooter({ text: `Página ${page + 1} de ${pages.length}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'prev') {
        page = page > 0 ? page - 1 : pages.length - 1;
      } else if (i.customId === 'next') {
        page = page < pages.length - 1 ? page + 1 : 0;
      }
      embed.setTitle(pages[page].title)
           .setFields(...pages[page].fields)
           .setFooter({ text: `Página ${page + 1} de ${pages.length}` });
      await i.update({ embeds: [embed], components: [row] });
    });
  }
};
