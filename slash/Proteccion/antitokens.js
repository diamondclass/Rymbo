const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('antitokens')
    .setDescription('Expulsa o banea usuarios sospechosos de ser selfbots o cuentas falsas.'),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'Necesito el permiso para Banear miembros.', ephemeral: true });
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Necesitas el permiso de Administrador.', ephemeral: true });
    if (_guild.protection.antitokens.enable === false) {
      _guild.protection.antitokens.enable = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      await interaction.reply({ content: 'Antitokens activado.' });
    } else {
      if (_guild.protection.verification._type === '--v4') return interaction.reply({ content: 'No se puede desactivar antitokens en este modo.', ephemeral: true });
      _guild.protection.antitokens.enable = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Antitokens desactivado.' });
    }
  }
};
