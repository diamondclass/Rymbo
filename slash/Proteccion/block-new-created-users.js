const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const { dataRequired, updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('bloq-new-created-users')
    .setDescription('Haz que solo usuarios con determinado tiempo en Discord puedan entrar a tu servidor.')
    .addStringOption(option => option.setName('time').setDescription('Tiempo (ej. 5m, 1h)').setRequired(true)),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'El bot no tiene permisos para banear miembros.', ephemeral: true });
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: 'No tienes permisos para banear miembros.', ephemeral: true });
    const timeArg = interaction.options.getString('time');
    let time = ms(timeArg);
    if (!time) return interaction.reply({ content: 'Error: No se ha ingresado un tiempo válido.', ephemeral: true });
    if (time < 300000) time = 300000;
    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.bloqNewCreatedUsers) _guild.protection.bloqNewCreatedUsers = {};
    _guild.protection.bloqNewCreatedUsers.time = time;
    _guild.protection.bloqNewCreatedUsers.enable = true;
    updateDataBase(interaction.client, interaction.guild, _guild, true);
    interaction.reply({ content: `Usuarios con cuentas creadas hace menos de \`${ms(time)}\` serán bloqueados de este servidor.` });
  }
};
