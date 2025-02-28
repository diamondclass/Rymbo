const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
const ballResponses = [
    "¡Sin duda alguna!",
    "Es decididamente así",
    "Probablemente",
    "Mis fuentes dicen que sí",
    "Las señales apuntan a que sí",
    "Respuesta confusa, intenta de nuevo",
    "Pregunta de nuevo más tarde",
    "Mejor no decirte ahora",
    "No puedo predecirlo ahora",
    "Concéntrate y pregunta de nuevo",
    "No cuentes con ello",
    "Mi respuesta es no",
    "Mis fuentes dicen que no",
    "Las perspectivas no son buenas",
    "Muy dudoso"
];
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Pregunta algo a la bola mágica 8')
        .addStringOption(option => option.setName('pregunta').setDescription('La pregunta a la bola mágica').setRequired(true)),
    async execute(interaction, _guild) {
        async function isUserBlacklisted(client, userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                console.log("Resultado de la búsqueda de blacklist:", user);
                if (user && user.removedAt == null) {
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Error buscando en la blacklist:', err);
                return false;
            }
        }
        const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
        console.log("¿Está en blacklist?", isBlacklisted);
        if (isBlacklisted) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }
        let user = await fecthUsersDataBase(interaction.client, interaction.user, false);
        if (!user) return interaction.reply({ content: 'Error: Tu documento en la base de datos no está definido.', ephemeral: true });
        user = { premium: {} };
        const question = interaction.options.getString('pregunta');
        const response = ballResponses[Math.floor(Math.random() * ballResponses.length)];
        const embed = new EmbedBuilder()
            .setColor('#00ADEF')
            .setTitle('🎱 La bola mágica dice...')
            .addFields(
                { name: 'Pregunta:', value: question },
                { name: 'Respuesta:', value: response }
            )
            .setFooter({ text: 'Rymbo' });
        interaction.reply({ embeds: [embed] });
    }
};
