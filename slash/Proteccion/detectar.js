const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('detectar')
    .setDescription('Detecta y muestra usuarios en la blacklist del servidor.'),
  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'No tienes permisos suficientes para usar este comando.', ephemeral: true });
      const blacklistEntries = await Blacklist.find({ guildId: interaction.guild.id, removedAt: { $exists: false } });
      if (blacklistEntries.length === 0) return interaction.reply({ content: 'Servidor asegurado, sin miembros en lista negra.', ephemeral: true });
      const blacklistedIds = new Set(blacklistEntries.map(entry => entry.userId));
      const guildMembers = await interaction.guild.members.fetch();
      const membersInBlacklist = guildMembers.filter(member => blacklistedIds.has(member.id));
      if (membersInBlacklist.size === 0) return interaction.reply({ content: 'No hay usuarios blacklisteados presentes en el servidor.', ephemeral: true });
      const membersArray = Array.from(membersInBlacklist.values());
      const itemsPerPage = 5;
      const pages = Math.ceil(membersArray.length / itemsPerPage);
      let currentPage = 0;
      const createEmbed = (page) => {
        const start = page * itemsPerPage;
        const end = Math.min(start + itemsPerPage, membersArray.length);
        const entries = membersArray.slice(start, end);
        const embedDescription = entries.map(member => {
          const entry = blacklistEntries.find(e => e.userId === member.id);
          return `**Usuario:** ${member.user.tag}\n**ID:** ${member.id}\n**Razón:** ${entry.reason || 'Sin razón'}\n**Prueba:** ${entry.proof || 'N/A'}\n**Fecha de Blacklist:** ${new Date(entry.addedAt).toLocaleDateString()}\n**Añadido por:** <@${entry.staffId}>`;
        });
        return new EmbedBuilder()
          .setTitle('Usuarios en Blacklist')
          .setColor(0xFF0000)
          .setDescription(embedDescription.join('\n\n'))
          .setFooter({ text: `Página ${page + 1} de ${pages}` })
          .setTimestamp();
      };
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('« Anterior')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Siguiente »')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= pages - 1)
      );
      await interaction.reply({ embeds: [createEmbed(currentPage)], components: [row] });
      const messageReply = await interaction.fetchReply();
      const collector = messageReply.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 60000 });
      collector.on('collect', async i => {
        if (i.customId === 'prev_page' && currentPage > 0) currentPage--;
        else if (i.customId === 'next_page' && currentPage < pages - 1) currentPage++;
        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('« Anterior')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Siguiente »')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= pages - 1)
        );
        await i.update({ embeds: [createEmbed(currentPage)], components: [newRow] });
      });
      collector.on('end', () => {
        messageReply.edit({ components: [] });
      });
    } catch (error) {
      console.error(error);
      interaction.reply({ content: 'Hubo un error al procesar el comando.', ephemeral: true });
    }
  }
};
