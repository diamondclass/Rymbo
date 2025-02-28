const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('intelligent-antiflood')
    .setDescription('Evita mensajes repetidos.'),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: 'Necesito permisos para administrar mensajes.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Solo el propietario del servidor puede usar este comando.', ephemeral: true });
    if (!_guild.protection) _guild.protection = {};
    if (typeof _guild.protection.intelligentAntiflood !== 'boolean') _guild.protection.intelligentAntiflood = false;
    if (_guild.protection.intelligentAntiflood === false) {
      _guild.protection.intelligentAntiflood = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Antiflood inteligente activado.' });
    } else {
      _guild.protection.intelligentAntiflood = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Antiflood inteligente desactivado.' });
    }
  }
};
