const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase, fecthDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('antichannels')
    .setDescription('Evita la creación y eliminación no autorizada de canales en el servidor.'),
  premium: false,
  category: 'Protección',
  async execute(client, interaction) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    const isBlacklisted = await isUserBlacklisted(client, interaction.user.id);
    if (isBlacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    const LANG = {
      activate: "El sistema de anticanales ha sido activado.",
      deactivate: "El sistema de anticanales ha sido desactivado.",
      permissionError: "Necesito permisos para __Banear miembros__.",
      ownerError: "Este comando solo puede ser usado por el propietario del servidor."
    };
    const _guild = await client.getGuildConfig(interaction.guild);
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: LANG.permissionError, ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: LANG.ownerError, ephemeral: true });
    _guild.protection.antichannels.enable = !_guild.protection.antichannels.enable;
    await updateDataBase(client, interaction.guild, _guild, true);
    if (_guild.protection.antichannels.enable) {
      interaction.reply({ content: LANG.activate });
    } else {
      interaction.reply({ content: LANG.deactivate });
    }
  }
};
