const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, SelectMenuBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('find')
    .setDescription('Busca a un usuario por tag o ID en los servidores donde está el bot.')
    .addStringOption(option =>
      option.setName('modo')
        .setDescription('Modo de búsqueda: userid o tag')
        .setRequired(true)
        .addChoices(
          { name: 'userid', value: 'userid' },
          { name: 'tag', value: 'tag' }
        ))
    .addStringOption(option =>
      option.setName('valor')
        .setDescription('El valor a buscar')
        .setRequired(true)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const member = allowedGuild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const modo = interaction.options.getString('modo').toLowerCase();
    const query = interaction.options.getString('valor');
    let foundUsers = [];
    if (!['userid', 'tag'].includes(modo)) {
      return interaction.reply({ content: 'Subcomando inválido. Usa `userid` o `tag`.', ephemeral: true });
    }
    for (const [guildId, guild] of interaction.client.guilds.cache) {
      try {
        const guildMember = guild.members.cache.find(m => modo === 'userid' ? m.user.id === query : m.user.tag === query);
        if (guildMember) {
          foundUsers.push({ user: guildMember, guild });
        }
      } catch (error) {
        console.error(`Error en ${guild.name}: ${error.message}`);
      }
    }
    if (foundUsers.length === 0) {
      return interaction.reply({ content: 'No se encontró al usuario en ningún servidor donde está el bot.', ephemeral: true });
    }
    const itemsPerPage = 10;
    const pages = Math.ceil(foundUsers.length / itemsPerPage);
    let page = 1;
    const generateEmbed = (page) => {
      const start = (page - 1) * itemsPerPage;
      const end = page * itemsPerPage;
      const currentPageUsers = foundUsers.slice(start, end);
      const embed = new EmbedBuilder()
        .setColor('#F0F0F0')
        .setTitle('Usuarios Encontrados')
        .setDescription(currentPageUsers.map(({ user, guild }) => `**${user.user.tag}** (ID: \`${user.user.id}\`) en **${guild.name}**`).join('\n'))
        .setFooter({ text: `Página ${page} de ${pages}`, iconURL: interaction.client.user.displayAvatarURL() });
      return embed;
    };
    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('searchUser')
        .setLabel('Buscar en servidores')
        .setStyle(1)
    );
    const menuOptions = Array.from({ length: pages }, (_, i) => ({
      label: `Página ${i + 1}`,
      value: (i + 1).toString(),
      description: `Ver información de la página ${i + 1}`
    }));
    const menuRow = new ActionRowBuilder().addComponents(
      new SelectMenuBuilder()
        .setCustomId('pageSelect')
        .setPlaceholder('Selecciona una página')
        .addOptions(menuOptions)
    );
    const initialEmbed = generateEmbed(page);
    await interaction.reply({ embeds: [initialEmbed], components: [buttonsRow, menuRow] });
    const msg = await interaction.fetchReply();
    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    collector.on('collect', async i => {
      if (i.isButton() && i.customId === 'searchUser') {
        await i.reply({ content: 'Escribe el tag o ID del usuario que deseas buscar entre los servidores donde está el bot:', ephemeral: false });
        const messageFilter = m => m.author.id === interaction.user.id;
        const collected = await interaction.channel.awaitMessages({ filter: messageFilter, max: 1, time: 30000 });
        const searchQuery = collected.first()?.content.toLowerCase();
        if (!searchQuery) {
          return i.followUp({ content: 'No escribiste nada, búsqueda cancelada.', ephemeral: false });
        }
        const searchResults = foundUsers.filter(({ user }) => 
          user.user.tag.toLowerCase().includes(searchQuery) || user.user.id.includes(searchQuery)
        );
        if (searchResults.length === 0) {
          return i.followUp({ content: 'No se encontraron usuarios con ese tag o ID entre los servidores donde está el bot.', ephemeral: false });
        }
        const searchEmbed = new EmbedBuilder()
          .setColor('#F0F0F0')
          .setTitle('Resultados de la búsqueda:')
          .setDescription(searchResults.map(({ user, guild }) => `**${user.user.tag}** (ID: \`${user.user.id}\`) en **${guild.name}**`).join('\n'))
          .setFooter({ text: `Se encontraron ${searchResults.length} resultados.`, iconURL: interaction.client.user.displayAvatarURL() });
        i.followUp({ embeds: [searchEmbed], ephemeral: false });
      } else if (i.isSelectMenu() && i.customId === 'pageSelect') {
        page = parseInt(i.values[0]);
        const newEmbed = generateEmbed(page);
        await i.update({ embeds: [newEmbed], components: [buttonsRow, menuRow] });
      }
    });
    collector.on('end', () => {
      msg.edit({ components: [] });
    });
  }
};
