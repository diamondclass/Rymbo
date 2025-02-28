const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('antijoins')
    .setDescription('Con el sistema activo, Rymbo expulsará/baneará todas las entradas de usuarios detectadas.'),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) {
          return true;
        }
        return false;
      } catch (err) {
        return false;
      }
    }
    const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (isBlacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'Necesito el permiso para __Banear miembros__.', ephemeral: true });
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'Necesitas el permiso para __Banear miembros__.', ephemeral: true });
    if (_guild.protection.antijoins.enable === false) {
      _guild.protection.antijoins.enable = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Antijoins activado.' });
    } else {
      _guild.protection.antijoins.enable = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Antijoins desactivado.' });
    }
  }
};
