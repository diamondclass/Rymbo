const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
const afkUsers = new Map();
module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Establece tu estado AFK con una razón opcional.')
        .addStringOption(option => option.setName('razon').setDescription('Razón para estar AFK').setRequired(false)),
    async execute(interaction) {
        async function isUserBlacklisted(userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                return user && user.removedAt == null;
            } catch (err) {
                console.error('Error buscando en la blacklist:', err);
                return false;
            }
        }
        if (await isUserBlacklisted(interaction.user.id)) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.' });
        }
        const razon = interaction.options.getString('razon') || 'No se especificó una razón';
        afkUsers.set(interaction.user.id, {
            reason: razon,
            timestamp: Date.now()
        });
        const afkEmbed = new EmbedBuilder()
            .setColor(0x00ADEF)
            .setTitle('Estado AFK Establecido')
            .setDescription(`**${interaction.user.tag}** ahora está AFK\n* Razón: ${razon}`)
            .setTimestamp()
            .setFooter({ text: 'Rymbo' });
        await interaction.reply({ embeds: [afkEmbed] });
    },
    handleMessage: async (client, message) => {
        if (message.author.bot) return;
        if (afkUsers.has(message.author.id)) {
            const afkInfo = afkUsers.get(message.author.id);
            const timeDiff = Date.now() - afkInfo.timestamp;
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            let timeString = '';
            if (hours > 0) timeString += `${hours} horas, `;
            if (minutes > 0) timeString += `${minutes} minutos, `;
            if (seconds > 0) timeString += `${seconds} segundos`;
            if (!timeString) timeString = '0 segundos';
            timeString = timeString.replace(/, $/, '');
            afkUsers.delete(message.author.id);
            const returnEmbed = new EmbedBuilder()
                .setColor(0x00ADEF)
                .setDescription(`¡Bienvenido de vuelta ${message.author}! Has estado AFK durante ${timeString}.`);
            message.reply({ embeds: [returnEmbed] });
        }
        message.mentions.users.forEach(mentionedUser => {
            const afkInfo = afkUsers.get(mentionedUser.id);
            if (afkInfo) {
                const timeDiff = Date.now() - afkInfo.timestamp;
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                let timeString = '';
                if (hours > 0) timeString += `${hours} horas, `;
                if (minutes > 0) timeString += `${minutes} minutos, `;
                if (seconds > 0) timeString += `${seconds} segundos`;
                if (!timeString) timeString = '0 segundos';
                timeString = timeString.replace(/, $/, '');
                const mentionEmbed = new EmbedBuilder()
                    .setColor(0x00ADEF)
                    .setDescription(`${mentionedUser.tag} está AFK\n* Razón: ${afkInfo.reason}\n* Hace: ${timeString}`)
                    .setTimestamp();
                message.reply({ embeds: [mentionEmbed] });
            }
        });
    }
};
