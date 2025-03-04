const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../schemas/guildsSchema');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiwebhook')
    .setDescription('Sistema para evitar la creación de webhooks.')
    .addIntegerOption(option => option.setName('maxwebhooks').setDescription('Límite máximo de webhooks')),
  async execute(interaction) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    
    const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (isBlacklisted)
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageWebhooks))
      return interaction.reply({ content: 'Necesitas permiso de Administrar webhooks.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ content: 'Solo el propietario del servidor puede utilizar este comando.', ephemeral: true });
    
    let guildData = await Guild.findOne({ id: interaction.guild.id });
    if (!guildData) {
      guildData = new Guild({ id: interaction.guild.id, ownerId: interaction.guild.ownerId });
    }
    if (!guildData.protection) {
      guildData.protection = {};
    }
    if (!guildData.protection.antiwebhook) {
      guildData.protection.antiwebhook = { enable: false, maxWebhooks: 3 };
    }
    
    const newLimit = interaction.options.getInteger('maxwebhooks');
    if (newLimit !== null) {
      guildData.protection.antiwebhook.maxWebhooks = newLimit;
      await guildData.save();
      return interaction.reply({ content: `El límite máximo de webhooks ha sido actualizado a ${newLimit}.` });
    } else {
      guildData.protection.antiwebhook.enable = !guildData.protection.antiwebhook.enable;
      const status = guildData.protection.antiwebhook.enable ? 'activado' : 'desactivado';
      await guildData.save();
      return interaction.reply({ content: `El sistema antiwebhook ha sido ${status}.` });
    }
  }
};
