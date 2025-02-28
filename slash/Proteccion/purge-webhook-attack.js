const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge-webhooks-attack')
    .setDescription('Detiene todos los posibles ataques de webhooks.'),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) return interaction.reply({ content: 'Necesito permisos para administrar webhooks.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Solo el dueño del servidor puede usar este comando.', ephemeral: true });
    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.purgeWebhooksAttacks) _guild.protection.purgeWebhooksAttacks = { enable: false };
    if (_guild.protection.purgeWebhooksAttacks.enable === false) {
      _guild.protection.purgeWebhooksAttacks.enable = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Sistema anti ataques de webhooks activado.' });
    } else {
      _guild.protection.purgeWebhooksAttacks.enable = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'Sistema anti ataques de webhooks desactivado.' });
    }
  }
};
