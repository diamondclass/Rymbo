const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const cooldown = new Map();
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('unnuke')
    .setDescription('Un destructor automático de canales raideados.')
    .addStringOption(option =>
      option
        .setName('option')
        .setDescription('Selecciona: channels, roles, emojis, bans')
        .setRequired(true)
        .addChoices(
          { name: 'channels', value: 'channels' },
          { name: 'roles', value: 'roles' },
          { name: 'emojis', value: 'emojis' },
          { name: 'bans', value: 'bans' }
        )
    ),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt == null;
      } catch (err) {
        return false;
      }
    }
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: 'Necesito el permiso de Administrar canales.', ephemeral: true });
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: 'Necesitas permisos de Administrar canales.', ephemeral: true });
    if (cooldown.has(interaction.user.id)) {
      let c = cooldown.get(interaction.user.id);
      if (c > Date.now()) return interaction.reply({ content: 'Por favor, espera antes de usar este comando nuevamente.', ephemeral: true });
      cooldown.delete(interaction.user.id);
    }
    let contador = 1;
    const option = interaction.options.getString('option');
    if (option === 'channels') {
      cooldown.set(interaction.user.id, Date.now() + ms('1s'));
      await interaction.reply({ content: 'Ejecutando unnuke...' });
      let _channels = [];
      interaction.guild.channels.cache.forEach(x => {
        if (_channels.includes(x.name)) {
          interaction.guild.channels.cache.forEach(i => {
            try {
              if (i.name === x.name) {
                contador++;
                setTimeout(() => { i.delete().catch(() => {}); }, 2000 * contador);
              }
            } catch (e) {}
          });
        } else {
          _channels.push(x.name);
        }
      });
    } else if (option === 'roles') {
      cooldown.set(interaction.user.id, Date.now() + ms('1s'));
      await interaction.reply({ content: 'Ejecutando unnuke...' });
      let _roles = [];
      interaction.guild.roles.cache.forEach(x => {
        contador++;
        if (_roles.includes(x.name)) {
          interaction.guild.roles.cache.forEach(i => {
            try {
              if (i.name === x.name) {
                setTimeout(() => { i.delete().catch(() => {}); }, 2000 * contador);
              }
            } catch (e) {}
          });
        } else {
          _roles.push(x.name);
        }
      });
    } else if (option === 'emojis') {
      cooldown.set(interaction.user.id, Date.now() + ms('1s'));
      await interaction.reply({ content: 'Ejecutando unnuke...' });
      let _emojis = [];
      interaction.guild.emojis.cache.forEach(x => {
        contador++;
        if (_emojis.includes(x.name)) {
          interaction.guild.emojis.cache.forEach(i => {
            try {
              if (i.name === x.name) {
                setTimeout(() => { i.delete().catch(() => {}); }, 2000 * contador);
              }
            } catch (e) {}
          });
        } else {
          _emojis.push(x.name);
        }
      });
    } else if (option === 'bans') {
      cooldown.set(interaction.user.id, Date.now() + ms('1s'));
      await interaction.reply({ content: 'Ejecutando unnuke...' });
      let bans = await interaction.guild.bans.fetch();
      bans.forEach(x => {
        contador++;
        setTimeout(() => { interaction.guild.members.unban(x.user.id).catch(() => {}); }, 2000 * contador);
      });
    } else {
      return interaction.reply({ content: 'Por favor especifica una opción: channels, roles, emojis, bans.', ephemeral: true });
    }
  }
};
