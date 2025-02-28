const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const patGifs = [
    "https://media.giphy.com/media/109ltuoSQT212w/giphy.gif",
    "https://media.giphy.com/media/5tmRHwTlHAA9WkVxTU/giphy.gif",
    "https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif",
    "https://media.giphy.com/media/66196zGvKvSLl7mXVl/giphy.gif",
    "https://media.giphy.com/media/L2z7dnOduqEow/giphy.gif"
];
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Dale palmaditas a alguien')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que deseas dar palmaditas')
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
            return interaction.reply({ content: '¡Menciona a alguien para darle palmaditas!', ephemeral: true });
        }
        const gifUrl = patGifs[Math.floor(Math.random() * patGifs.length)];
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setDescription(`¡**${interaction.user.username}** le da palmaditas a **${member.user.username}**! 🤚`)
            .setImage(gifUrl)
            .setFooter({ text: 'Rymbo' });
        interaction.reply({ embeds: [embed] });
    }
};
