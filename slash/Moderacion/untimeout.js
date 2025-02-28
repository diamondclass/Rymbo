const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Sanction = require('../../schemas/sanctionSchema');
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
    .setName('untimeout')
    .setDescription('Elimina el timeout de un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que quitar el timeout')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón para quitar el timeout')
        .setRequired(false)),
  async execute(interaction) {
    const msg1 = 'Por favor menciona un usuario.';
    const msg2 = 'No puedes quitar el timeout a ti mismo.';
    const msg3 = 'No puedes quitar el timeout a un usuario de igual o mayor rol.';
    const msg4 = 'No puedo quitar el timeout a este usuario.';
    const msg5 = 'Timeout eliminado para';
    const msg6 = 'No he podido eliminar el timeout para';

    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'Necesito el permiso para moderar miembros.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'Necesitas el permiso para moderar miembros.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) {
      return interaction.reply({ content: msg1, ephemeral: true });
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: msg2, ephemeral: true });
    }
    if (targetUser.id === interaction.client.user.id) {
      return;
    }
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        return interaction.reply({ content: msg3, ephemeral: true });
      }
      if (!targetMember.moderatable) {
        return interaction.reply({ content: msg4, ephemeral: true });
      }
    }
    const reason = interaction.options.getString('razon') || msg5;
    try {
      await targetMember.timeout(null, reason);
      const sanction = new Sanction({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        action: 'UNTIMEOUT',
        moderator: interaction.user.id,
        reason: msg5
      });
      await sanction.save();
      return interaction.reply({ content: `${msg5} \`${targetUser.username}\`. ✅`, ephemeral: false });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: `${msg6} \`${targetUser.username}\` ❌`, ephemeral: true });
    }
  }
};
