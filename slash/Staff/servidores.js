const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder } = require('discord.js');
const axios = require('axios');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('servidores')
    .setDescription('Muestra los servidores en los que está el bot.'),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const member = allowedGuild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const guilds = interaction.client.guilds.cache
      .map(guild => ({
        name: guild.name,
        id: guild.id,
        memberCount: guild.memberCount
      }))
      .sort((a, b) => b.memberCount - a.memberCount);
    const itemsPerPage = 10;
    const pages = Math.ceil(guilds.length / itemsPerPage);
    let page = 1;
    const generateEmbed = (page) => {
      const start = (page - 1) * itemsPerPage;
      const end = page * itemsPerPage;
      const currentPageGuilds = guilds.slice(start, end);
      const embed = new EmbedBuilder()
        .setColor('#F0F0F0')
        .setTitle('Servidores en los que estoy:')
        .setFooter({ text: `Página ${page} de ${pages}`, iconURL: interaction.client.user.displayAvatarURL() });
      currentPageGuilds.forEach(g => {
        embed.addFields({ name: g.name, value: `ID: ${g.id}\nMiembros: ${g.memberCount}`, inline: false });
      });
      return embed;
    };
    const pasteContent = guilds.map(g => `Servidor: ${g.name} | ID: ${g.id} | Miembros: ${g.memberCount}`).join('\n');
    let pasteUrl = null;
    try {
      const response = await axios.post('https://hastebin.com/documents', pasteContent, {
        headers: { 
          'Content-Type': 'text/plain',
          'Authorization': 'Bearer 50cdf07023fa93cd77c9322e53d3c060adede2a642cf9d2a64525eb69a97f4d6fc4098a1b81d3e7f2e24e44c6e1d9abf8a7fcaf29da9c8ac174aba17dd2a2392'
        }
      });
      pasteUrl = `https://hastebin.com/${response.data.key}`;
    } catch (error) {
      console.error('Error al subir a Hastebin:', error.message);
      pasteUrl = null;
    }
    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('searchServer').setLabel('Buscar').setStyle('Primary')
    );
    const menuRow = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId('pageSelect')
        .setPlaceholder('Selecciona una página')
        .addOptions(
          Array.from({ length: pages }, (_, i) => ({
            label: `Página ${i + 1}`,
            value: (i + 1).toString(),
            description: `Ver información de la página ${i + 1}`
          }))
        )
    );
    const pastebinButtonRow = pasteUrl 
      ? new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel('Ver lista completa en Hastebin').setStyle('Link').setURL(pasteUrl)
        )
      : null;
    const initialEmbed = generateEmbed(page);
    const components = [buttonsRow, menuRow];
    if (pastebinButtonRow) components.push(pastebinButtonRow);
    await interaction.reply({ embeds: [initialEmbed], components: components });
    const msg = await interaction.fetchReply();
    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    collector.on('collect', async i => {
      if (i.isButton() && i.customId === 'searchServer') {
        await i.reply({ content: 'Escribe el nombre o ID del servidor que deseas buscar:', ephemeral: false });
        const messageFilter = m => m.author.id === interaction.user.id;
        const collected = await interaction.channel.awaitMessages({ filter: messageFilter, max: 1, time: 30000 });
        const searchQuery = collected.first()?.content.toLowerCase();
        if (!searchQuery) {
          return i.followUp({ content: 'No escribiste nada, búsqueda cancelada.', ephemeral: false });
        }
        const searchResults = guilds.filter(
          g => g.name.toLowerCase().includes(searchQuery) || g.id.includes(searchQuery)
        );
        if (searchResults.length === 0) {
          return i.followUp({ content: 'No se encontraron servidores con ese nombre o ID.', ephemeral: false });
        }
        const searchEmbed = new EmbedBuilder()
          .setColor('#F0F0F0')
          .setTitle('Resultados de la búsqueda:')
          .setDescription(
            searchResults.map(g => `**${g.name}**\nID: ${g.id}\nMiembros: ${g.memberCount}`).join('\n\n')
          )
          .setFooter({ text: `Se encontraron ${searchResults.length} resultados.`, iconURL: interaction.client.user.displayAvatarURL() });
        i.followUp({ embeds: [searchEmbed], ephemeral: false });
      } else if (i.isSelectMenu() && i.customId === 'pageSelect') {
        page = parseInt(i.values[0]);
        const newEmbed = generateEmbed(page);
        await i.update({ embeds: [newEmbed], components: components });
      }
    });
    collector.on('end', () => {
      msg.edit({ components: [] });
    });
  }
};
