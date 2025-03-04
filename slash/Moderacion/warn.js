const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, PermissionsBitField } = require('discord.js');
const { dataRequired, fecthDataBase, updateDataBase } = require('../../functions');
const Warns = require('../../schemas/warnsSchema');
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
    .setName('warn')
    .setDescription('Agrega un aviso a un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario a avisar')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('La razón del aviso')
        .setRequired(false)),
  async execute(interaction) {
    const invalidUserText = "No puedes moderarte a ti mismo.";
    const hierarchyErrorText = "No puedes moderar a un usuario de igual o mayor rango.";
    const defaultReason = "Sin razón proporcionada.";
    const warnAddedText = "Has agregado un aviso a";
    const totalWarnsText = "avisos.";
    const modResponsibleText = "Moderador responsable";
    const silencedText = "El usuario ha sido silenciado por alcanzar el límite de avisos.";
    const banText = "El usuario ha sido baneado por alcanzar el límite de avisos.";
    const noRepeatActionText = "No repitas la acción del moderador automáticamente.";
    const actionRevertedText = "La acción será revertida.";
    
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: "No puedes usar este comando porque estás en la lista negra.", ephemeral: true });
    }
    const _guild = await fecthDataBase(interaction.client, interaction.guild, false);
    if (!_guild) {
      return interaction.reply({ content: "No se pudo cargar la configuración del servidor.", ephemeral: true });
    }
    const forcedReasons = _guild.moderation.dataModeration.forceReasons;
    let reason = interaction.options.getString('razon');
    if (forcedReasons && forcedReasons.length > 0) {
      if (!reason) {
        return interaction.reply({ content: `Debes proporcionar una razón para el aviso. Razones permitidas: ${forcedReasons.join(', ')}`, ephemeral: true });
      }
      if (!forcedReasons.includes(reason)) {
        return interaction.reply({ content: `La razón proporcionada no es válida. Razones permitidas: ${forcedReasons.join(', ')}`, ephemeral: true });
      }
    }
    if (!reason) reason = defaultReason;
    
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) {
      return interaction.reply({ content: "Por favor proporciona un usuario válido.", ephemeral: true });
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ content: invalidUserText, ephemeral: true });
    }
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({ content: "No puedes avisar al bot.", ephemeral: true });
    }
    
    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (err) {
      targetMember = null;
    }
    if (targetMember) {
      if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
        return interaction.reply({ content: hierarchyErrorText, ephemeral: true });
      }
    }
    
    let userWarns = await Warns.findOne({ guildId: interaction.guild.id, userId: targetUser.id });
    if (userWarns) {
      userWarns.warns.push({ reason: reason, moderator: interaction.user.id });
      await userWarns.save();
    } else {
      userWarns = new Warns({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        warns: [{ reason: reason, moderator: interaction.user.id }],
        subCount: 0
      });
      await userWarns.save();
    }
    const warnCount = userWarns.warns.length;
    const warnEmbed = new EmbedBuilder()
      .setColor('#00ADEF')
      .setDescription(`<@${targetUser.id}>, ${warnAddedText} **${warnCount}** ${totalWarnsText}\n${modResponsibleText}: <@${interaction.user.id}>\nRazón: **${reason}**`)
      .setTimestamp();
    await interaction.reply({ embeds: [warnEmbed] });
    
    if (_guild.moderation.automoderator.enable === true && targetMember) {
      const thresholds = _guild.moderation.automoderator.actions.warns; 
      if (warnCount === thresholds[0]) {
        try {
          await targetMember.timeout(600000, "Alcanzó el límite de avisos"); 
          const timeoutEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setDescription(`${silencedText}\n${noRepeatActionText}`)
            .setTimestamp();
          const timeoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('noRepeat')
              .setLabel('No repetir acción')
              .setStyle('Danger')
          );
          await interaction.followUp({ embeds: [timeoutEmbed], components: [timeoutRow] });
        } catch (err) {
          await interaction.followUp({ content: `No he podido silenciar a ${targetUser.tag}.`, ephemeral: true });
        }
      } else if (warnCount === thresholds[1]) {
        try {
          await targetMember.ban({ reason: reason });
          const banEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`${banText}\n${actionRevertedText}`)
            .setTimestamp();
          const banRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('noRepeat')
              .setLabel('No repetir acción')
              .setStyle('Danger')
          );
          await interaction.followUp({ embeds: [banEmbed], components: [banRow] });
        } catch (err) {
          await interaction.followUp({ content: `No he podido banear a ${targetUser.tag}.`, ephemeral: true });
        }
      }
    }
  }
};
