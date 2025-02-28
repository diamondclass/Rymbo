const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge-channels-by-name')
    .setDescription('Borra todos los canales (de texto, de voz y categorías) que tengan el nombre especificado.')
    .addStringOption(option => option.setName('name').setDescription('Nombre del canal o categoría a eliminar').setRequired(true)),
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
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: 'Necesito permisos para gestionar canales.', ephemeral: true });
    const channelName = interaction.options.getString('name').toLowerCase();
    const channelsToDelete = interaction.guild.channels.cache.filter(channel =>
      channel.name.toLowerCase() === channelName && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildCategory)
    );
    if (channelsToDelete.size === 0) return interaction.reply({ content: `No se encontraron canales o categorías con el nombre **${channelName}**.`, ephemeral: true });
    channelsToDelete.forEach(channel => {
      channel.delete().catch(() => {});
    });
    interaction.reply({ content: `Eliminando ${channelsToDelete.size} canal(es) o categoría(s) con el nombre **${channelName}**, si se vuelven a crear, utiliza r!antichannels para desactivar el sistema.` });
  }
};
