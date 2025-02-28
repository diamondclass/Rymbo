const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const Guild = require('../../schemas/guildsSchema');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Muestra el estado de los sistemas de protección.'),
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
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    const checkmark = "<:Checkmark:1278179814339252299>";
    const crossmark = "<:Crossmark:1278179784433864795>";
    const guildData = await Guild.findOne({ id: interaction.guild.id });
    if (!guildData || !guildData.protection) return interaction.reply({ content: "No se pudo obtener el estado de protección. Los datos no están disponibles.", ephemeral: true });
    const pages = [
      {
        title: "Estado de los sistemas de protección - Página 1",
        fields: [
          { name: 'Antibots', value: guildData.protection.antibots.enable ? checkmark : crossmark, inline: true },
          { name: 'Antiflood', value: guildData.protection.antiflood ? checkmark : crossmark, inline: true },
          { name: 'Antijoins', value: guildData.protection.antijoins.enable ? checkmark : crossmark, inline: true },
          { name: 'Antiraid', value: guildData.protection.antiraid.enable ? checkmark : crossmark, inline: true },
          { name: 'Antitokens', value: guildData.protection.antitokens.enable ? checkmark : crossmark, inline: true },
          { name: 'Bloq-entrities-by-name', value: guildData.protection.bloqEntritiesByName.enable ? checkmark : crossmark, inline: true },
          { name: 'Bloq-new-created-users', value: guildData.protection.bloqNewCreatedUsers ? checkmark : crossmark, inline: true }
        ]
      },
      {
        title: "Estado de los sistemas de protección - Página 2",
        fields: [
          { name: 'Cannot-enter-twice', value: guildData.protection.cannotEnterTwice.enable ? checkmark : crossmark, inline: true },
          { name: 'Raidmode', value: guildData.protection.raidmode.enable ? `${checkmark} Tiempo: ${guildData.protection.raidmode.timeToDisable}` : crossmark, inline: true },
          { name: 'Antiwebhook', value: guildData.protection.antiwebhook.enable ? `${checkmark} Máximo: ${guildData.protection.antiwebhook.maxWebhooks}` : crossmark, inline: true },
          { name: 'Verification', value: guildData.protection.verification.enable ? `${checkmark} Canal: <#${guildData.protection.verification.channel}>` : crossmark, inline: true },
          { name: 'Antichannels', value: guildData.protection.antichannels.enable ? checkmark : crossmark, inline: true },
          { name: 'Logs', value: guildData.configuration.logs.length > 0 ? `${checkmark} Canal: <#${guildData.configuration.logs[0]}>` : crossmark, inline: true }
        ]
      },
      {
        title: "Estado de los sistemas de protección - Página 3",
        fields: [
          { name: 'AntiInfecteds', value: guildData.protection.antiInfecteds.enable ? checkmark : crossmark, inline: true },
          { name: 'AntiBotSpam', value: guildData.protection.antiBotSpam.enable ? checkmark : crossmark, inline: true },
          { name: 'AntiInfecteds', value: guildData.protection.IntelligentAntiflood.enable ? checkmark : crossmark, inline: true }
        ]
      }
    ];
    let page = 0;
    const embed = new EmbedBuilder()
      .setColor("#00ADEF")
      .setTitle(pages[page].title)
      .addFields(pages[page].fields)
      .setFooter({ text: 'Rymbo' });
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
      embed.setTitle(pages[page].title).setFields(...pages[page].fields);
      await i.update({ embeds: [embed], components: [row] });
    });
  }
};
