const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
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
    .setName('kick')
    .setDescription('Expulsa a un usuario de tu servidor.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a expulsar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del kick')
        .setRequired(false)),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'No tengo permisos para expulsar.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ content: 'No tienes permisos para expulsar.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) {
      return interaction.reply({ content: 'Por favor proporciona un usuario válido.', ephemeral: true });
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: 'No puedes expulsarte a ti mismo.', ephemeral: true });
    }
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({ content: 'No puedo expulsarme a mí mismo.', ephemeral: true });
    }
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.reply({ content: 'No puedes expulsar a un usuario de igual o mayor rango.', ephemeral: true });
      }
      if (!targetMember.kickable) {
        return interaction.reply({ content: 'No puedo expulsar a este usuario.', ephemeral: true });
      }
    }
    const reason = interaction.options.getString('razon') || 'Sin razón especificada.';
    try {
      await interaction.guild.members.kick(targetUser.id, { reason });
      const sanction = new Sanction({
        userId: targetUser.id,
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        sanctionType: 'kick',
        reason: reason
      });
      await sanction.save();
      const embed = new EmbedBuilder()
        .setDescription(`El usuario ${targetUser.tag} ha sido expulsado por ${interaction.user.tag}. Razón: ${reason}.`)
        .setColor('Red')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: 'No se pudo expulsar al usuario.', ephemeral: true });
    }
  }
};
