const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugerencia')
    .setDescription('Envía una sugerencia sobre el bot.')
    .addStringOption(option => option.setName('mensaje').setDescription('El mensaje de la sugerencia').setRequired(true)),
  async execute(interaction) {
    async function isUserBlacklisted(userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: false });
    }
    const suggestionText = interaction.options.getString('mensaje');
    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00ADEF)
      .setTitle('Confirmar Sugerencia')
      .setDescription(suggestionText)
      .setFooter({ text: '¿Deseas enviar esta sugerencia?' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: false });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 15000 });
    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        const suggestionEmbed = new EmbedBuilder()
          .setColor(0x00ADEF)
          .setTitle('Sugerencia')
          .setDescription(suggestionText)
          .setAuthor({ name: `${interaction.user.tag}, ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setFooter({ text: `${interaction.guild.name}, ${interaction.guild.id}`, iconURL: interaction.guild.iconURL() });
        await i.update({ content: 'Tu sugerencia ha sido enviada.', embeds: [], components: [] });
        interaction.client.channels.cache.get("1277357469076815912").send({ embeds: [suggestionEmbed] });
        collector.stop();
      } else if (i.customId === 'cancel') {
        await i.update({ content: 'Sugerencia cancelada.', embeds: [], components: [] });
        collector.stop();
      }
    });
    collector.on('end', async collected => {
      if (!collected.size) {
        await interaction.editReply({ content: 'Tiempo expirado. Sugerencia cancelada.', components: [] });
      }
    });
  }
};
