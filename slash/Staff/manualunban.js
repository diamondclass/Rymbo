const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('manualunban')
    .setDescription('Permite desbanear a un usuario en un servidor específico usando la ID del usuario y del servidor.')
    .addStringOption(option =>
      option.setName('serverid')
        .setDescription('ID del servidor')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID del usuario')
        .setRequired(true)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const staffMember = allowedGuild.members.cache.get(interaction.user.id);
    if (!staffMember || !staffMember.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const serverId = interaction.options.getString('serverid');
    const userId = interaction.options.getString('userid');
    const guild = interaction.client.guilds.cache.get(serverId);
    if (!guild) return interaction.reply({ content: 'No se pudo encontrar el servidor con la ID proporcionada.', ephemeral: true });
    try {
      const user = await interaction.client.users.fetch(userId);
      await guild.members.unban(userId);
      return interaction.reply({ content: `El usuario ${user.tag} ha sido desbaneado del servidor con ID: ${serverId}` });
    } catch (error) {
      console.error(`Error al desbanear al usuario: ${error}`);
      return interaction.reply({ content: 'Hubo un error al intentar desbanear al usuario. Asegúrate de que el bot tenga permisos para desbanear en ese servidor.', ephemeral: true });
    }
  }
};
