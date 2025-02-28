const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiinfecteds')
    .setDescription('El bot detectará y sancionará a usuarios infectados.'),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Necesito el permiso para __Administrador__.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Solo el dueño del servidor puede usar este comando.', ephemeral: true });
    if (_guild.protection.antiInfecteds.enable === false) {
      _guild.protection.antiInfecteds.enable = true;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      await interaction.reply({ content: 'AntiInfecteds activado.' });
      interaction.guild.roles.cache.forEach(role => {
        if (!role.managed && role.mentionable) role.edit({ mentionable: false }).catch(() => {});
      });
    } else {
      _guild.protection.antiInfecteds.enable = false;
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      interaction.reply({ content: 'AntiInfecteds desactivado.' });
    }
  }
};
