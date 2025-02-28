const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge-roles-by-name')
    .setDescription('Borra todos los roles que tengan el nombre especificado.')
    .addStringOption(option => option.setName('role').setDescription('Nombre del rol a eliminar').setRequired(true)),
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
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Solo el dueño del servidor puede usar este comando.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.reply({ content: 'Necesito permisos para gestionar roles.', ephemeral: true });
    const roleName = interaction.options.getString('role').toLowerCase();
    const rolesToDelete = interaction.guild.roles.cache.filter(role => role.name.toLowerCase() === roleName && role.id !== interaction.guild.id);
    if (rolesToDelete.size === 0) return interaction.reply({ content: `No se encontraron roles con el nombre **${roleName}**.`, ephemeral: true });
    rolesToDelete.forEach(role => {
      role.delete().catch(() => {});
    });
    interaction.reply({ content: `Eliminando ${rolesToDelete.size} rol(es) con el nombre **${roleName}**.` });
  }
};
