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
    .setName('iploggerfilter')
    .setDescription('Si se edita o se envía un link con iplogger, se eliminará.'),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'Necesito permisos para administrar mensajes.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'No tienes permisos para administrar mensajes.', ephemeral: true });
    }
    let _guild = await fecthDataBase(interaction.client, interaction.guild, false);
    if (!_guild) {
      return interaction.reply({ content: 'No se pudo cargar la configuración del servidor.', ephemeral: true });
    }
    if (!_guild.moderation) _guild.moderation = {};
    if (!_guild.moderation.dataModeration) _guild.moderation.dataModeration = {};
    if (!_guild.moderation.dataModeration.events) _guild.moderation.dataModeration.events = {};
    if (typeof _guild.moderation.dataModeration.events.iploggerFilter === 'undefined') {
      _guild.moderation.dataModeration.events.iploggerFilter = false;
    }
    
    if (_guild.moderation.dataModeration.events.iploggerFilter === false) {
      _guild.moderation.dataModeration.events.iploggerFilter = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: 'Detector de iplogger activado.', ephemeral: false });
    } else {
      _guild.moderation.dataModeration.events.iploggerFilter = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: 'Detector de iplogger desactivado.', ephemeral: false });
    }
  }
};
