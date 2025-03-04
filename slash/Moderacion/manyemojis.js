const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase, fecthDataBase } = require('../../functions');
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
    .setName('manyemojis')
    .setDescription('Evita mensajes que incluyan muchos emojis.')
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad máxima de emojis permitidos (opcional)')
    ),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
      return interaction.reply({ content: 'Necesito permisos para administrar emojis y stickers.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
      return interaction.reply({ content: 'No tienes permisos para administrar emojis y stickers.', ephemeral: true });
    }
    
    const _guild = await fecthDataBase(interaction.client, interaction.guild, false);
    if (!_guild) {
      return interaction.reply({ content: 'No se pudo cargar la configuración del servidor.', ephemeral: true });
    }

    if (!_guild.moderation) _guild.moderation = {};
    if (!_guild.moderation.automoderator) _guild.moderation.automoderator = { actions: {} };
    if (!_guild.moderation.automoderator.actions) _guild.moderation.automoderator.actions = {};
    if (!_guild.moderation.dataModeration) _guild.moderation.dataModeration = {};
    if (!_guild.moderation.dataModeration.events) _guild.moderation.dataModeration.events = {};
    if (typeof _guild.moderation.dataModeration.events.manyEmojis === 'undefined') {
      _guild.moderation.dataModeration.events.manyEmojis = false;
    }

    const cantidad = interaction.options.getInteger('cantidad');
    if (cantidad !== null) {
      _guild.moderation.automoderator.actions.manyEmojis = cantidad;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: `Cantidad máxima de emojis establecida en ${cantidad}.`, ephemeral: false });
    } else {
      if (_guild.moderation.dataModeration.events.manyEmojis === false) {
        _guild.moderation.dataModeration.events.manyEmojis = true;
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: 'Detector de muchos emojis activado.', ephemeral: false });
      } else {
        _guild.moderation.dataModeration.events.manyEmojis = false;
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: 'Detector de muchos emojis desactivado.', ephemeral: false });
      }
    }
  }
};
