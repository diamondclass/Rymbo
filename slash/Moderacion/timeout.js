const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
const ms = require('ms');

async function isUserBlacklisted(client, userId) {
  try {
    const user = await Blacklist.findOne({ userId });
    return user && user.removedAt == null;
  } catch (err) {
    console.error('Error checking blacklist:', err);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Aplica timeout a un usuario usando el sistema oficial de Discord.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a aislar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tiempo')
        .setDescription('Tiempo de timeout (ej. 10m, 1h)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del timeout')
        .setRequired(false)),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'No tengo permisos para moderar miembros.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'No tienes permisos para moderar miembros.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) {
      return interaction.reply({ content: 'Debes especificar un usuario válido.', ephemeral: true });
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: 'No puedes aplicar timeout a ti mismo.', ephemeral: true });
    }
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({ content: 'No puedes aplicar timeout al bot.', ephemeral: true });
    }
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (err) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        return interaction.reply({ content: 'No puedes aplicar timeout a un usuario de igual o mayor rango.', ephemeral: true });
      }
      if (!targetMember.moderatable) {
        return interaction.reply({ content: 'No puedo aplicar timeout a este usuario.', ephemeral: true });
      }
    }
    let timeInput = interaction.options.getString('tiempo');
    let timeMs = ms(timeInput);
    if (!timeMs) {
      return interaction.reply({ content: 'El tiempo proporcionado no es válido.', ephemeral: true });
    }
    const minimum = ms('10m');
    if (timeMs < minimum) {
      timeMs = minimum;
      timeInput = '10m';
    }
    const reason = interaction.options.getString('razon') || 'Sin razón especificada.';
    try {
      await targetMember.timeout(timeMs, reason);
      return interaction.reply({ content: `El usuario ${targetUser.tag} ha sido puesto en timeout por ${timeInput}.`, ephemeral: false });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `No se pudo aplicar timeout a ${targetUser.tag}.`, ephemeral: true });
    }
  }
};
