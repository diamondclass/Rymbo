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
    .setName('unban')
    .setDescription('Desbanea a un usuario de tu servidor.')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('La ID del usuario a desbanear')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '⚠️ No tengo permisos para desbanear miembros en este servidor.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '⚠️ No tienes permisos para desbanear miembros en este servidor.', ephemeral: true });
    }
    const userIdInput = interaction.options.getString('userid');
    let targetUser;
    try {
      targetUser = await interaction.client.users.fetch(userIdInput);
      if (!targetUser) {
        return interaction.reply({ content: '❌ Error 005: No se puede obtener este usuario.', ephemeral: true });
      }
    } catch (err) {
      return interaction.reply({ content: '❌ Error 005: No se puede obtener este usuario.', ephemeral: true });
    }
    try {
      await interaction.guild.members.unban(userIdInput);
      const sanction = new Sanction({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        sanctionType: 'UNBAN',
        moderatorId: interaction.user.id,
        reason: 'El usuario ha sido desbaneado sin razón especificada.'
      });
      await sanction.save();
      const embed = new EmbedBuilder()
        .setDescription(`✅ El usuario \`${targetUser.tag}\` ha sido desbaneado correctamente.`)
        .setColor('Green')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error al desbanear al usuario:', err);
      return interaction.reply({ content: '❌ Ocurrió un error al intentar desbanear al usuario. ¿Está baneado?', ephemeral: true });
    }
  }
};
