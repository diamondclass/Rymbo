const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Activa un sistema de verificación para evitar selfbots.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Tipo de verificación')
        .setRequired(true)
        .addChoices(
          { name: 'V1 - Automático (manual con /verify)', value: 'v1' },
          { name: 'V2 - Captcha', value: 'v2' },
          { name: 'V3 - Botón (clic en botón)', value: 'v3' },
          { name: 'V4 - Automático (antitokens)', value: 'v4' }
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Canal para enviar la verificación (no requerido en V4)')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Rol a asignar al verificarse (no requerido en V4)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('buttoncontent')
        .setDescription('Texto del botón (solo para V3)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('messagecontent')
        .setDescription('Mensaje a enviar junto al botón (solo para V3)')
        .setRequired(false)
    ),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt == null;
      } catch {
        return false;
      }
    }
    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: 'Necesito permiso de Administrar roles.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'Necesitas permiso de Administrador.', ephemeral: true });
    }
    if (_guild.protection.verification.enable) {
      _guild.protection.verification.enable = false;
      if (_guild.protection.verification._type === 'v4') {
        _guild.protection.antitokens.enable = false;
        await interaction.followUp({ content: 'Se desactivó antitokens para V4.', ephemeral: true });
      }
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: 'Verificación desactivada.' });
    }
    _guild.protection.verification.enable = true;
    const type = interaction.options.getString('type');
    _guild.protection.verification._type = type;
    if (type !== 'v4') {
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      if (!channel) return interaction.reply({ content: 'Debes especificar un canal para este tipo de verificación.', ephemeral: true });
      if (!role) return interaction.reply({ content: 'Debes especificar un rol para este tipo de verificación.', ephemeral: true });
      if (interaction.member.roles.highest.position <= role.position) {
        return interaction.reply({ content: 'El rol mencionado es igual o superior a tu rol.', ephemeral: true });
      }
      if (!interaction.guild.roles.cache.has(role.id)) {
        return interaction.reply({ content: 'El rol mencionado no existe en este servidor.', ephemeral: true });
      }
      _guild.protection.verification.channel = channel.id;
      _guild.protection.verification.role = role.id;
    }
    if (type === 'v1') {
      interaction.reply({ content: 'Sistema activado. Ahora puedes verificar manualmente usando el comando /verify.', ephemeral: false });
    } else if (type === 'v2') {
      interaction.reply({ content: 'Sistema activado. Al detectar un usuario, enviaré un captcha en el canal de verificación.', ephemeral: false });
    } else if (type === 'v3') {
      let buttonContent = interaction.options.getString('buttoncontent') || 'No soy un robot';
      let messageContent = interaction.options.getString('messagecontent') || '¡Haz click en el botón para verificarte!';
      const verifyEmbed = new EmbedBuilder().setColor("#00ADEF").setDescription(messageContent);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verifyButton').setLabel(buttonContent).setStyle(ButtonStyle.Primary)
      );
      const channel = interaction.options.getChannel('channel');
      await channel.send({ embeds: [verifyEmbed], components: [row] });
      interaction.reply({ content: 'Sistema activado. Se ha enviado el botón de verificación al canal especificado.', ephemeral: false });
    } else if (type === 'v4') {
      if (!_guild.protection.antitokens.enable) {_guild.protection.antitokens.enable = true;}interaction.reply({ content: 'Sistema activado. Los miembros se verificarán automáticamente mediante antitokens.', ephemeral: false });
    }
    updateDataBase(interaction.client, interaction.guild, _guild, true);
  }
};
