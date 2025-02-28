const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('manualban')
    .setDescription('Permite banear a un usuario en un servidor específico usando la ID del usuario y del servidor.')
    .addStringOption(option => option.setName('serverid').setDescription('ID del servidor').setRequired(true))
    .addStringOption(option => option.setName('userid').setDescription('ID del usuario').setRequired(true))
    .addStringOption(option => option.setName('razon').setDescription('Razón del baneo').setRequired(false)),
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
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const guild = interaction.client.guilds.cache.get(serverId);
    if (!guild) return interaction.reply({ content: 'No se pudo encontrar el servidor con la ID proporcionada.', ephemeral: true });
    try {
      const user = await interaction.client.users.fetch(userId);
      await guild.members.ban(user, { reason });
      return interaction.reply({ content: `El usuario ${user.tag} ha sido baneado del servidor con ID: ${serverId} por la razón: ${reason}`, ephemeral: false });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: 'Hubo un error al intentar banear al usuario. Asegúrate de que el bot tenga permisos para banear en ese servidor.', ephemeral: true });
    }
  }
};
