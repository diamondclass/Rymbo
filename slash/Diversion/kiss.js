const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const kissGifs = [
    "https://media.giphy.com/media/bGm9FuBCGg4SY/giphy.gif",
    "https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif",
    "https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif",
    "https://media.giphy.com/media/zkppEMFvRX5FC/giphy.gif",
    "https://media.giphy.com/media/Y9iiZdUaNRF2U/giphy.gif"
];
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Dale un beso a alguien')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que deseas besar')
                .setRequired(true)
        ),
    async execute(interaction, _guild) {
        const Blacklist = require('../../schemas/blacklist');
        async function isUserBlacklisted(client, userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                if (user && user.removedAt == null) {
                    return true;
                }
                return false;
            } catch (err) {
                return false;
            }
        }
        const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
        if (isBlacklisted) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }
        let user = await fecthUsersDataBase(interaction.client, interaction.user, false);
        if (!user) return interaction.reply({ content: 'Error: Tu documento en la base de datos no está definido.', ephemeral: true });
        user = { premium: {} };
        const member = interaction.options.getMember('usuario');
        if (!member) {
            return interaction.reply({ content: '¡Menciona a alguien para darle un beso!', ephemeral: true });
        }
        const gifUrl = kissGifs[Math.floor(Math.random() * kissGifs.length)];
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setDescription(`¡**${interaction.user.username}** le da un beso a **${member.user.username}**! 💋`)
            .setImage(gifUrl)
            .setFooter({ text: 'Rymbo' });
        interaction.reply({ embeds: [embed] });
    }
};
