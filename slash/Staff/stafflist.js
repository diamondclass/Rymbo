const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('stafflist')
    .setDescription('Lista todos los miembros del equipo de staff en el servidor.')
    .setDMPermission(false),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    if (interaction.guild.id !== allowedGuildId) {
      return interaction.reply({ content: 'Este comando solo se puede ejecutar en el servidor autorizado.', ephemeral: true });
    }
    try {
      const role = interaction.guild.roles.cache.get(requiredRoleId);
      if (!role) return interaction.reply({ content: 'El rol de staff no fue encontrado en este servidor.', ephemeral: true });
      const membersWithRole = role.members.map(member => `<@${member.user.id}> (ID: ${member.id})`);
      if (membersWithRole.length === 0) {
        return interaction.reply({ content: `No hay miembros del equipo de staff con el rol ${role}.`, ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('<:Members:1278539258692374591> | Miembros del equipo de Staff')
        .setColor('#00ADEF')
        .setDescription(membersWithRole.join('\n'))
        .setFooter({ text: 'Rymbo' });
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al listar los miembros del staff:', error);
      return interaction.reply({ content: 'Hubo un error al intentar listar los miembros del staff.', ephemeral: true });
    }
  }
};
