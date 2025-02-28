const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

async function isUserBlacklisted(client, userId) {
  const Blacklist = require('../../schemas/blacklist');
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
    .setName('lock')
    .setDescription('Bloquea el canal actual para que solo el personal pueda enviar mensajes.')
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('Rol al que se aplicará el bloqueo (opcional). Si no se especifica, se bloqueará para todos.')
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
    const role = interaction.options.getRole('rol');
    try {
      if (role) {
        await interaction.channel.permissionOverwrites.edit(role.id, {
          SEND_MESSAGES: false
        });
      } else {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
          SEND_MESSAGES: false
        });
      }
      return interaction.reply({ content: 'El canal ha sido bloqueado correctamente.', ephemeral: false });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `Error: ${err.toString()}`, ephemeral: true });
    }
  }
};
