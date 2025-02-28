const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const hugGifs = [
    "https://media.giphy.com/media/u9BxQbM5bxvwY/giphy.gif",
    "https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif",
    "https://media.giphy.com/media/3bqtLDeiDtwhq/giphy.gif",
    "https://media.giphy.com/media/LIqFOpO9Qh0uA/giphy.gif",
    "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif"
];
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Dale un abrazo a alguien')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que deseas abrazar')
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
            return interaction.reply({ content: '¡Menciona a alguien para abrazarlo!', ephemeral: true });
        }
        const gifUrl = hugGifs[Math.floor(Math.random() * hugGifs.length)];
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setDescription(`¡**${interaction.user.username}** le da un abrazo a **${member.user.username}**! 🤗`)
            .setImage(gifUrl)
            .setFooter({ text: 'Rymbo' });
        interaction.reply({ embeds: [embed] });
    }
};
