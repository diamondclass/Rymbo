const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibots')
    .setDescription('Evita entrada de bots indeseadas en tu servidor.'),
  premium: false,
  category: 'Protección',
  async execute(client, interaction) {
    const isUserBlacklisted = async (client, userId) => {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    };

    const isBlacklisted = await isUserBlacklisted(client, interaction.user.id);
    if (isBlacklisted) 
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });

    const _guild = await client.getGuildConfig(interaction.guild);

    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.antibots) _guild.protection.antibots = { enable: false, _type: 'all' };

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) 
      return interaction.reply({ content: 'Necesito permisos para __Banear miembros__.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId) 
      return interaction.reply({ content: 'Solo el dueño del servidor puede ejecutar este comando.', ephemeral: true });

    if (!_guild.protection.antibots.enable) {
      _guild.protection.antibots.enable = true;
      const embed = new EmbedBuilder()
        .setColor("#00ADEF")
        .setDescription('El sistema antibots ha sido activado.');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('all').setLabel('Todos').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('only_nv').setLabel('Solo no verificados').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('only_v').setLabel('Solo verificados').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 1000000 });

      collector.on('collect', async (i) => {
        if (!i.isButton()) return;
        _guild.protection.antibots._type = i.customId;
        await i.reply({ content: 'El sistema antibots ha sido actualizado.', ephemeral: true });
        updateDataBase(client, interaction.guild, _guild, true);
        collector.stop();
      });

      collector.on('end', async () => {
        await interaction.followUp({ content: 'Configuración completada.' });
      });

    } else {
      _guild.protection.antibots.enable = false;
      updateDataBase(client, interaction.guild, _guild, true);
      await interaction.reply({ content: 'El sistema antibots ha sido desactivado.' });
    }
  }
};
