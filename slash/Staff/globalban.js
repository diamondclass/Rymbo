const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('globalban')
    .setDescription('Banea a un usuario de todos los servidores en los que está el bot usando su ID.')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('El ID del usuario a banear')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('La razón del baneo')
        .setRequired(false)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const staffMember = allowedGuild.members.cache.get(interaction.user.id);
    if (!staffMember || !staffMember.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes permisos suficientes para usar este comando. Solo el equipo de staff puede usar este comando.', ephemeral: true });
    }
    const userId = interaction.options.getString('userid');
    if (!userId) return interaction.reply({ content: 'Debes proporcionar un ID de usuario para banearlo globalmente.', ephemeral: true });
    const reason = interaction.options.getString('razon') || 'No especificada';
    let banCount = 0;
    for (const guild of interaction.client.guilds.cache.values()) {
      try {
        const targetMember = await guild.members.fetch(userId).catch(() => null);
        if (targetMember) {
          await targetMember.ban({ reason: `Globalban: ${reason}` });
          banCount++;
        }
      } catch (error) {
        console.log(`No se pudo banear en ${guild.name}: ${error.message}`);
      }
    }
    return interaction.reply({ content: `Se ha baneado al usuario con ID **${userId}** de ${banCount} servidores.\n**Razón:** ${reason}`, ephemeral: false });
  }
};
