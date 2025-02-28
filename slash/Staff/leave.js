const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Permite al bot abandonar un servidor.')
    .addStringOption(option => option.setName('serverid').setDescription('El ID del servidor del que deseas que el bot se salga.').setRequired(true)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'El servidor permitido no se encuentra disponible.', ephemeral: true });
    const member = allowedGuild.members.cache.get(interaction.user.id);
    const hasRequiredRole = member && member.roles.cache.has(requiredRoleId);
    if (!hasRequiredRole) return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    const serverId = interaction.options.getString('serverid');
    const guild = interaction.client.guilds.cache.get(serverId);
    if (!guild) return interaction.reply({ content: 'No se pudo encontrar el servidor con el ID proporcionado.', ephemeral: true });
    try {
      await guild.leave();
      return interaction.reply({ content: `El bot ha abandonado el servidor con ID: ${serverId}` });
    } catch (error) {
      console.error(`Error al abandonar el servidor: ${error}`);
      return interaction.reply({ content: 'Hubo un error al intentar abandonar el servidor.', ephemeral: true });
    }
  }
};
