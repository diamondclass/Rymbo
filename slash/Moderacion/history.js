const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');
const Sanction = require('../../schemas/sanctionSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Muestra el historial de sanciones de un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a consultar')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const sanctions = await Sanction.find({ userId: user.id });
    if (!sanctions || sanctions.length === 0) {
      return interaction.reply({ content: `No hay sanciones registradas para <@${user.id}>.`, ephemeral: false });
    }
    const pageSize = 5;
    const totalPages = Math.ceil(sanctions.length / pageSize);
    let currentPage = 0;
    const createHistoryEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setTitle(`Historial de Sanciones de ${user.tag}`)
        .setColor('#00ADEF')
        .setDescription('A continuación se muestra el historial de sanciones:')
        .setFooter({ text: `Página ${page + 1} de ${totalPages}` });
      const start = page * pageSize;
      const end = Math.min(start + pageSize, sanctions.length);
      for (let i = start; i < end; i++) {
        const sanction = sanctions[i];
        embed.addFields({
          name: `Tipo: ${sanction.sanctionType}`,
          value: `Razón: **${sanction.reason}**\nModerador: <@${sanction.moderatorId}>\nFecha: ${new Date(sanction.createdAt).toLocaleDateString()}`,
          inline: false
        });
      }
      return embed;
    };
    const initialEmbed = createHistoryEmbed(currentPage);
    const options = Array.from({ length: totalPages }, (_, i) => ({
      label: `Página ${i + 1}`,
      value: `${i}`
    }));
    const menu = new SelectMenuBuilder()
      .setCustomId('select')
      .setPlaceholder('Selecciona una página')
      .addOptions(options);
    const row = new ActionRowBuilder().addComponents(menu);
    const msg = await interaction.reply({ embeds: [initialEmbed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      componentType: ComponentType.SelectMenu,
      time: 60000
    });
    collector.on('collect', async i => {
      currentPage = parseInt(i.values[0]);
      const newEmbed = createHistoryEmbed(currentPage);
      await i.update({ embeds: [newEmbed], components: [row] });
    });
    collector.on('end', async () => {
      await interaction.editReply({ components: [] });
    });
  }
};
