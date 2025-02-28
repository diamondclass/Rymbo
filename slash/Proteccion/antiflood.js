const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiflood')
    .setDescription('Evita muchos mensajes a la vez que inunden un canal.')
    .addIntegerOption(option => option.setName('maxamountdetect').setDescription('Cantidad máxima para detectar flood').setRequired(false)),

  async execute(interaction) {
    const isUserBlacklisted = async (userId) => {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    };

    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }

    const _guild = await interaction.client.getGuildConfig(interaction.guild);
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'Necesito el permiso __Administrar mensajes__.', ephemeral: true });
    }

    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'Solo el dueño del servidor puede usar este comando.', ephemeral: true });
    }

    const floodAmount = interaction.options.getInteger('maxamountdetect');
    if (floodAmount !== null) {
      _guild.moderation.automoderator.actions.floodDetect = floodAmount;
      await updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: 'Se ha actualizado la cantidad máxima de mensajes para detectar flood.' });
    } else {
      _guild.protection.antiflood = !_guild.protection.antiflood;
      await updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: _guild.protection.antiflood ? 'El sistema antiflood ha sido activado.' : 'El sistema antiflood ha sido desactivado.' });
    }
  }
};
