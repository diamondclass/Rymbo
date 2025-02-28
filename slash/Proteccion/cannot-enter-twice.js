const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('cannot-enter-twice')
    .setDescription('Evita dos entradas del mismo usuario en tu servidor.'),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'Necesito el permiso para banear miembros.', ephemeral: true });
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Necesitas el permiso de administrador.', ephemeral: true });
    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.cannotEnterTwice) _guild.protection.cannotEnterTwice = { enable: false, users: [] };
    if (_guild.protection.cannotEnterTwice.enable === false) {
      _guild.protection.cannotEnterTwice.enable = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'El sistema para evitar dos entradas del mismo usuario ha sido activado.' });
    } else {
      _guild.protection.cannotEnterTwice.enable = false;
      _guild.protection.cannotEnterTwice.users = [];
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'El sistema para evitar dos entradas del mismo usuario ha sido desactivado.' });
    }
  }
};
