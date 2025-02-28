const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, PermissionsBitField } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-invite')
    .setDescription('Crea una invitación para el servidor especificado por su ID.')
    .addStringOption(option =>
      option.setName('serverid')
        .setDescription('ID del servidor para crear la invitación')
        .setRequired(true)
    ),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const staffMember = allowedGuild.members.cache.get(interaction.user.id);
    if (!staffMember || !staffMember.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const serverId = interaction.options.getString('serverid');
    const targetGuild = interaction.client.guilds.cache.get(serverId);
    if (!targetGuild) return interaction.reply({ content: 'No se pudo encontrar el servidor con la ID proporcionada.', ephemeral: true });
    try {
      const channel = targetGuild.channels.cache.find(ch =>
        ch.type === ChannelType.GuildText &&
        ch.permissionsFor(targetGuild.members.me).has(PermissionsBitField.Flags.CreateInstantInvite)
      );
      if (!channel) {
        return interaction.reply({ content: `Servidor encontrado: **${targetGuild.name}**, pero no se pudo crear una invitación (no hay canales disponibles).`, ephemeral: true });
      }
      const invite = await channel.createInvite({ maxAge: 0, maxUses: 1 });
      const inviteEmbed = new EmbedBuilder()
        .setColor('#F0F0F0')
        .setTitle('Invitación Creada')
        .setDescription(`Se ha generado una invitación para el servidor **${targetGuild.name}**.`)
        .addFields(
          { name: '🔗 Enlace de Invitación:', value: `[Click aquí para unirte](${invite.url})` },
          { name: '📋 Detalles del Servidor:', value: `**ID:** ${targetGuild.id}\n**Miembros:** ${targetGuild.memberCount}` }
        )
        .setFooter({ text: 'Rymbo', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      const inviteButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(`Unirse a ${targetGuild.name}`)
          .setStyle('Link')
          .setURL(invite.url)
      );
      return interaction.reply({ embeds: [inviteEmbed], components: [inviteButton] });
    } catch (error) {
      console.error(`Error al crear la invitación: ${error.message}`);
      return interaction.reply({ content: 'Hubo un error al intentar crear la invitación.', ephemeral: true });
    }
  }
};
