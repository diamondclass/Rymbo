const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { dataRequired, pulk, updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('bebn')
    .setDescription('Expulsa usuarios con nombres no deseados.')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Añade un nombre a la lista de bloqueo.')
        .addStringOption(option => option.setName('name').setDescription('El nombre a bloquear').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Elimina un nombre de la lista de bloqueo.')
        .addIntegerOption(option => option.setName('index').setDescription('El índice del nombre a eliminar').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand.setName('clearall')
        .setDescription('Limpia la lista de nombres bloqueados.')
    ),
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
    if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Solo el propietario del servidor puede utilizar este comando.', ephemeral: true });
    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.bloqEntritiesByName) _guild.protection.bloqEntritiesByName = { names: [] };
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') {
      const name = interaction.options.getString('name').toLowerCase();
      _guild.protection.bloqEntritiesByName.names.push(name);
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      await interaction.reply({ content: `La palabra "${name}" ha sido agregada a la lista de bloqueo.` });
    } else if (subcommand === 'remove') {
      if (_guild.protection.bloqEntritiesByName.names.length === 0) return interaction.reply({ content: 'La lista de nombres bloqueados está vacía.', ephemeral: true });
      const index = interaction.options.getInteger('index');
      if (index < 1 || index > _guild.protection.bloqEntritiesByName.names.length) return interaction.reply({ content: 'El número ingresado no corresponde a ningún nombre.', ephemeral: true });
      const removedName = _guild.protection.bloqEntritiesByName.names[index - 1];
      _guild.protection.bloqEntritiesByName.names = await pulk(_guild.protection.bloqEntritiesByName.names, removedName);
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      await interaction.reply({ content: `El nombre "${removedName}" ha sido eliminado de la lista de bloqueo.` });
    } else if (subcommand === 'clearall') {
      _guild.protection.bloqEntritiesByName.names = [];
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      await interaction.reply({ content: 'La lista de nombres bloqueados ha sido vaciada.' });
    }
  }
};
