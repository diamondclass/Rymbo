const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { dataRequired, pulk, updateDataBase, fecthDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

async function isUserBlacklisted(client, userId) {
  try {
    const user = await Blacklist.findOne({ userId });
    if (user && user.removedAt == null) return true;
    return false;
  } catch (err) {
    console.error('Error buscando en la blacklist:', err);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badword')
    .setDescription('Haz que el bot borre palabras prohibidas en el servidor.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Agrega una nueva mala palabra a la lista.')
        .addStringOption(option =>
          option.setName('palabra')
            .setDescription('La palabra que deseas bloquear.')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Elimina una mala palabra de la lista.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clearall')
        .setDescription('Elimina todas las malas palabras de la lista.')),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'Necesito permiso de Administrador.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return interaction.reply({ content: 'Necesitas permiso de Administrador.', ephemeral: true });
    }
    let _guild = await fecthDataBase(interaction.client, interaction.guild, false);
    if (!_guild) {
      return interaction.reply({ content: 'No se pudo cargar la configuración del servidor.', ephemeral: true });
    }
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') {
      const word = interaction.options.getString('palabra').toLowerCase();
      _guild.moderation.dataModeration.badwords.push(word);
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: `He agregado la palabra \`${word}\` a la lista.`, ephemeral: false });
    } else if (subcommand === 'clearall') {
      _guild.moderation.dataModeration.badwords = [];
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: 'Lista de malas palabras limpiada.', ephemeral: false });
    } else if (subcommand === 'remove') {
      const badwords = _guild.moderation.dataModeration.badwords;
      if (!badwords || badwords.length === 0) {
        return interaction.reply({ content: 'No hay malas palabras en la lista.', ephemeral: true });
      }
      const options = badwords.slice(0, 25).map(word => ({
        label: word.length > 25 ? word.slice(0, 22) + '...' : word,
        description: `Eliminar la palabra ${word}`,
        value: word
      }));
      const selectMenu = new SelectMenuBuilder()
        .setCustomId('badword_remove')
        .setPlaceholder('Selecciona la palabra a eliminar')
        .addOptions(options);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.reply({ content: 'Selecciona la palabra que deseas eliminar:', components: [row], ephemeral: true });
      const filter = i => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'SELECT_MENU', time: 30000 });
      collector.on('collect', async i => {
        const selected = i.values[0];
        _guild.moderation.dataModeration.badwords = pulk(_guild.moderation.dataModeration.badwords, selected);
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        await i.update({ content: `La palabra \`${selected}\` ha sido eliminada.`, components: [] });
        collector.stop();
      });
      collector.on('end', () => {});
    } else {
      return interaction.reply({ content: await dataRequired('¡Esa función no es válida!\n\n/badword {add, remove, clearAll}'), ephemeral: true });
    }
  }
};
