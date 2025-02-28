const Guilds = require('../../schemas/guildsSchema');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra la latencia del bot.'),
  async execute(interaction, client) {
    const Blacklist = require('../../schemas/blacklist');
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
    const isBlacklisted = await isUserBlacklisted(client, interaction.user.id);
    if (isBlacklisted) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    try {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('refresh_ping').setLabel('🔄 Reintentar').setStyle(1)
      );
      const calculatePing = async () => {
        let initialMessage = await interaction.reply({ content: '<:Cooldown:1278484817985404992> Calculando ping...', fetchReply: true });
        let msgPing = initialMessage.createdTimestamp - interaction.createdTimestamp;
        let apiPing = client.ws.ping;
        let dbStart = Date.now();
        await Guilds.findOne({ id: interaction.guild.id });
        let dbPing = Date.now() - dbStart;
        let cacheStart = Date.now();
        await client.database.guilds.get(interaction.guild.id, true);
        let cachePing = Date.now() - cacheStart;
        return { msgPing, apiPing, dbPing, cachePing, initialMessage };
      };
      const { msgPing, apiPing, dbPing, cachePing, initialMessage } = await calculatePing();
      const pingEmbed = new EmbedBuilder()
        .setColor('#00ADEF')
        .setTitle('<a:a_stats:953184308233908265> Ping del Bot')
        .setDescription('Aquí está la latencia actual del bot:')
        .addFields(
          { name: '🌐 Latencia de Mensajes', value: `${msgPing}ms`, inline: true },
          { name: '🤖 Latencia de la API', value: `${apiPing}ms`, inline: true },
          { name: '📚 Latencia de la DB', value: `${dbPing}ms`, inline: true },
          { name: '📁 Latencia de Caché', value: `${cachePing}ms`, inline: true }
        )
        .setFooter({ text: 'Rymbo' });
      await interaction.editReply({ content: null, embeds: [pingEmbed], components: [row] });
      const filter = (i) => i.customId === 'refresh_ping' && i.user.id === interaction.user.id;
      const collector = initialMessage.createMessageComponentCollector({ filter, time: 1000000 });
      collector.on('collect', async (i) => {
        if (i.customId === 'refresh_ping') {
          const { msgPing, apiPing, dbPing, cachePing } = await calculatePing();
          const refreshedEmbed = new EmbedBuilder()
            .setColor('#00ADEF')
            .setTitle('<a:a_stats:953184308233908265> Ping del Bot')
            .setDescription('Aquí está la latencia actual del bot:')
            .addFields(
              { name: '🌐 Latencia de Mensajes', value: 'N/A', inline: true },
              { name: '🤖 Latencia de la API', value: `${apiPing}ms`, inline: true },
              { name: '📚 Latencia de la DB', value: `${dbPing}ms`, inline: true },
              { name: '📁 Latencia de Caché', value: `${cachePing}ms`, inline: true }
            )
            .setFooter({ text: 'Rymbo' });
          await i.update({ embeds: [refreshedEmbed] });
        }
      });
      collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('refresh_ping').setLabel('🔄 Refrescar Ping').setStyle(1).setDisabled(true)
        );
        interaction.editReply({ components: [disabledRow] });
      });
    } catch {
      interaction.reply({ content: 'Ocurrió un error al intentar mostrar el ping.', ephemeral: true });
    }
  },
};
