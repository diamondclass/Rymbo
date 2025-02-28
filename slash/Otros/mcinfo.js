const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
module.exports = {
  data: new SlashCommandBuilder()
    .setName('mcinfo')
    .setDescription('Obtén información sobre un servidor de Minecraft.')
    .addStringOption(option => option.setName('direccion').setDescription('La dirección del servidor de Minecraft').setRequired(true)),
  async execute(interaction) {
    async function isUserBlacklisted(userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        console.log("Resultado de la búsqueda de blacklist:", user);
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        console.error('Error buscando en la blacklist:', err);
        return false;
      }
    }
    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.' });
    }
    let userDB = await fecthUsersDataBase(interaction.client, interaction.user, false);
    if (!userDB) return interaction.reply({ content: 'Error: Tu documento en la base de datos no está definido.' });
    userDB = { premium: {} };
    const direccion = interaction.options.getString('direccion');
    const url = `https://api.mcstatus.io/v2/status/java/${direccion}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.online) {
        return interaction.reply({ content: 'El servidor de Minecraft no está en línea o la dirección es incorrecta.' });
      }
      const motd = data.motd?.clean || 'Desconocido';
      const favicon = data.favicon || "https://cdn.discordapp.com/attachments/1277170460924317777/1279309437483614228/minecraft.jpg";
      const version = data.version?.name || 'Desconocida';
      const playersOnline = data.players?.online || 'Desconocido';
      const playersMax = data.players?.max || 'Desconocido';
      const embed = new EmbedBuilder()
        .setColor(0x00ADEF)
        .setTitle('Información del servidor de Minecraft')
        .setDescription(`**Servidor:** ${data.hostname || 'Desconocido'}\n**Estado:** ${data.online ? 'En línea' : 'Fuera de línea'}\n**Jugadores:** ${playersOnline} / ${playersMax}\n**Versión:** ${version}\n**Motd:** ${motd}`)
        .setFooter({ text: 'Rymbo' })
        .setImage(favicon);
      interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error al obtener información del servidor de Minecraft:', err);
      interaction.reply({ content: 'Hubo un problema al obtener la información del servidor.' });
    }
  }
};
