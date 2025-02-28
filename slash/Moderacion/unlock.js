const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');

async function isUserBlacklisted(client, userId) {
  try {
    const user = await Blacklist.findOne({ userId });
    return user && user.removedAt == null;
  } catch (err) {
    console.error('Error buscando en la blacklist:', err);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquea el canal actual para que se puedan enviar mensajes.')
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('El rol a desbloquear. Si se omite, se desbloqueará para todos.')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'Necesito permisos para gestionar roles.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'Necesitas permisos para gestionar roles.', ephemeral: true });
    }
    try {
      const role = interaction.options.getRole('rol');
      if (role) {
        await interaction.channel.permissionOverwrites.edit(role.id, { SEND_MESSAGES: true });
      } else {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SEND_MESSAGES: true });
      }
      return interaction.reply({ content: 'Canal desbloqueado correctamente.', ephemeral: false });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
};
