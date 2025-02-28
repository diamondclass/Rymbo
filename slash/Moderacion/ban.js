const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Sanction = require('../../schemas/sanctionSchema');
const { dataRequired } = require('../../functions');
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
    .setName('ban')
    .setDescription('Banea a un usuario de tu servidor.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a banear')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del baneo')
        .setRequired(false)),
  async execute(interaction) {
    const LANG = {
      commands: {
        mod: {
          ban: {
            message1: 'Por favor menciona o proporciona la ID de un usuario.',
            message2: 'No puedes banearte a ti mismo.',
            message3: 'No puedes banear a un usuario de igual o mayor rango.',
            message4: 'Sin razón especificada.',
            message8: 'No puedo banear a este usuario.',
            message10: 'El usuario <user> ha sido baneado por <moderator>. Razón: <reason>.',
            message11: 'No se pudo banear al usuario.'
          }
        }
      }
    };
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'No tengo permisos para banear.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'No tienes permisos para banear.', ephemeral: true });
    }
    const user = interaction.options.getUser('usuario');
    if (!user) return interaction.reply({ content: LANG.commands.mod.ban.message1, ephemeral: true });
    if (user.id === interaction.user.id) return interaction.reply({ content: LANG.commands.mod.ban.message2, ephemeral: true });
    if (user.id === interaction.client.user.id) return;
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(user.id);
    } catch (error) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.reply({ content: LANG.commands.mod.ban.message3, ephemeral: true });
      }
    }
    const reason = interaction.options.getString('razon') || LANG.commands.mod.ban.message4;
    try {
      await interaction.guild.members.ban(user.id, { reason });
      const newSanction = new Sanction({
        userId: user.id,
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        sanctionType: 'ban',
        reason
      });
      await newSanction.save();
      const banEmbed = new EmbedBuilder()
        .setDescription(
          LANG.commands.mod.ban.message10
            .replace('<user>', user.tag)
            .replace('<moderator>', interaction.user.tag)
            .replace('<reason>', reason)
        )
        .setColor('Red')
        .setTimestamp();
      return interaction.reply({ embeds: [banEmbed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: LANG.commands.mod.ban.message11, ephemeral: true });
    }
  }
};
