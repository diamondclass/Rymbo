const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, PermissionsBitField } = require('discord.js');
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
    .setName('mod')
    .setDescription('Administra a un usuario mediante timeout, expulsión o ban.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a moderar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón de la sanción')
        .setRequired(false)),
  async execute(interaction) {
    const invalidUserText = 'No puedes moderarte a ti mismo o al bot.';
    const hierarchyErrorText = 'No puedes moderar a un usuario de igual o mayor rango.';
    const defaultReason = 'Sin razón.';
    const timeoutFailText = 'No puedo poner a este usuario en timeout.';
    const kickFailText = 'No puedo expulsar a este usuario.';
    const banFailText = 'No puedo banear a este usuario.';
    const confirmTextTemplate = 'Por favor confirma que deseas **{action}** a **<@{userId}>** (ID: {userId}) con la razón: **{reason}**';
    const actionSuccessTemplate = 'Acción realizada con éxito: **{action}**';

    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
        !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers) ||
        !interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'No tengo los permisos necesarios para moderar (timeout, kick o banear).', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
        !interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
        !interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: 'No tienes los permisos necesarios para moderar.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) {
      return interaction.reply({ content: 'Por favor proporciona un usuario válido.', ephemeral: true });
    }
    if (targetUser.id === interaction.user.id || targetUser.id === interaction.client.user.id) {
      return interaction.reply({ content: invalidUserText, ephemeral: true });
    }
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        return interaction.reply({ content: hierarchyErrorText, ephemeral: true });
      }
    }
    const reason = interaction.options.getString('razon') || defaultReason;
    const sanctionEmbed = new EmbedBuilder()
      .setTitle('Moderación')
      .setDescription(`Selecciona una acción para <@${targetUser.id}>.\nRazón: ${reason}`)
      .setColor('#00ADEF');
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('timeout').setLabel('Timeout').setStyle('Secondary'),
      new ButtonBuilder().setCustomId('kick').setLabel('Expulsar').setStyle('Primary'),
      new ButtonBuilder().setCustomId('ban').setLabel('Banear').setStyle('Danger'),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle('Danger')
    );
    await interaction.reply({ embeds: [sanctionEmbed], components: [actionRow], ephemeral: true });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'cancel') {
        await i.update({ content: 'Acción cancelada.', embeds: [], components: [] });
        return collector.stop();
      }
      let sanctionType = '';
      if (i.customId === 'timeout') {
        if (!targetMember || !targetMember.moderatable) {
          return i.reply({ content: timeoutFailText, ephemeral: true });
        }
        sanctionType = 'timeout';
      } else if (i.customId === 'kick') {
        if (!targetMember || !targetMember.kickable) {
          return i.reply({ content: kickFailText, ephemeral: true });
        }
        sanctionType = 'kick';
      } else if (i.customId === 'ban') {
        if (!targetMember || !targetMember.bannable) {
          return i.reply({ content: banFailText, ephemeral: true });
        }
        sanctionType = 'ban';
      }
      const confirmText = confirmTextTemplate
        .replace(/{action}/g, sanctionType)
        .replace(/{userId}/g, targetUser.id)
        .replace(/{reason}/g, reason);
      const confirmEmbed = new EmbedBuilder()
        .setTitle('Confirmación de Acción')
        .setDescription(confirmText)
        .setColor('#00ADEF');
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle('Success'),
        new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle('Danger')
      );
      await i.update({ embeds: [confirmEmbed], components: [confirmRow] });
      const confirmCollector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, componentType: ComponentType.Button, time: 60000 });
      confirmCollector.on('collect', async response => {
        if (response.customId === 'confirm') {
          let actionDescription = '';
          try {
            if (sanctionType === 'timeout') {
              await targetMember.timeout(600000, reason); // 10 minutes timeout
              actionDescription = `Se ha puesto en timeout a <@${targetUser.id}> por **${reason}**.`;
            } else if (sanctionType === 'kick') {
              await targetMember.kick(reason);
              actionDescription = `Se ha expulsado a <@${targetUser.id}> por **${reason}**.`;
            } else if (sanctionType === 'ban') {
              await targetMember.ban({ reason });
              actionDescription = `Se ha baneado a <@${targetUser.id}> por **${reason}**.`;
            }
            const sanctionRecord = new Sanction({
              userId: targetUser.id,
              guildId: interaction.guild.id,
              moderatorId: interaction.user.id,
              sanctionType: sanctionType,
              reason: reason
            });
            await sanctionRecord.save();
            const successEmbed = new EmbedBuilder()
              .setTitle('Acción Realizada')
              .setDescription(actionSuccessTemplate
                .replace(/{action}/g, sanctionType))
              .setColor('#32CD32')
              .setTimestamp();
            await response.update({ content: actionDescription, embeds: [successEmbed], components: [] });
            confirmCollector.stop();
            collector.stop();
          } catch (err) {
            console.error(err);
            await response.update({ content: 'Ocurrió un error al intentar realizar la acción.', embeds: [], components: [] });
          }
        } else if (response.customId === 'cancel') {
          await response.update({ content: 'Acción cancelada.', embeds: [], components: [] });
          confirmCollector.stop();
        }
      });
    });
    collector.on('end', async () => {
      await msg.edit({ components: [] });
    });
  }
};
