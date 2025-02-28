const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, PermissionsBitField } = require('discord.js');
const Sanction = require('../../schemas/sanctionSchema');
const Blacklist = require('../../schemas/blacklist');
const { dataRequired } = require('../../functions');

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
    .setName('hackban')
    .setDescription('Banea a un usuario que no esté dentro de tu servidor.')
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID del usuario a banear')
        .setRequired(true)
    ),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'Necesito permiso para banear miembros.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'No tienes permisos para banear miembros.', ephemeral: true });
    }
    const userId = interaction.options.getString('userid');
    if (isNaN(userId)) {
      return interaction.reply({ content: 'La ID proporcionada no es válida.', ephemeral: true });
    }
    let targetUser;
    try {
      targetUser = await interaction.client.users.fetch(userId);
      if (!targetUser) {
        return interaction.reply({ content: 'No se encontró un usuario con esa ID.', ephemeral: true });
      }
    } catch (err) {
      return interaction.reply({ content: 'No se encontró un usuario con esa ID.', ephemeral: true });
    }
    const confirmEmbed = new EmbedBuilder()
      .setDescription(`¿Estás seguro de que deseas banear a \`${targetUser.tag}\` (ID: ${targetUser.id})?`)
      .setColor('Yellow')
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle('Success'),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle('Danger')
    );
    await interaction.reply({
      content: 'Confirma tu acción:',
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true
    });
    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 30000
      });
      if (buttonInteraction.customId === 'confirm') {
        try {
          await interaction.guild.members.ban(targetUser.id, { reason: 'Baneo realizado mediante hackban' });
          try {
            await targetUser.send(`Has sido baneado de \`${interaction.guild.name}\`.`);
          } catch (e) {
            console.log('No se pudo enviar DM al usuario.');
          }
          const sanction = new Sanction({
            userId: targetUser.id,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            sanctionType: 'hackban',
            reason: 'Baneo realizado mediante hackban'
          });
          await sanction.save();
          await buttonInteraction.update({ content: `\`${targetUser.tag}\` ha sido baneado exitosamente.`, embeds: [], components: [] });
        } catch (err) {
          console.error('Error al banear:', err);
          await buttonInteraction.update({ content: 'No se pudo banear al usuario.', embeds: [], components: [] });
        }
      } else if (buttonInteraction.customId === 'cancel') {
        await buttonInteraction.update({ content: 'El hackban ha sido cancelado.', embeds: [], components: [] });
      }
    } catch (err) {
      await interaction.editReply({ content: 'La confirmación ha expirado.', embeds: [], components: [] });
    }
  }
};
