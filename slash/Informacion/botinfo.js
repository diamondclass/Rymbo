const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchUsersDatabase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Obtén información sobre el bot.'),
    async execute(interaction) {
        const isUserBlacklisted = async (userId) => {
            try {
                const user = await Blacklist.findOne({ userId });
                return user && user.removedAt == null;
            } catch (err) {
                console.error('Error buscando en la blacklist:', err);
                return false;
            }
        };

        if (await isUserBlacklisted(interaction.user.id)) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }

        let user = await fetchUsersDatabase(interaction.client, interaction.user, false);
        if (!user) {
            return interaction.reply({ content: 'Err: Tu documento en la base de datos no está definido.', ephemeral: true });
        }

        let maliciosos = await Blacklist.countDocuments({});

        const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle('Información del bot')
            .setDescription(`> Dueño: <@1216532655592439862> (zhypeado#0000)
> Servidores: ${interaction.client.guilds.cache.size}
> Maliciosos: ${maliciosos}

> Usa \`/ping\` para ver mi estado.

> Librería: \`discord.js\`
> Base de datos: \`MongoDB\``)
            .setImage("https://cdn.discordapp.com/attachments/1313338210642034738/1313341567154524220/Untitled_Project8.jpg?ex=675070e6&is=674f1f66&hm=f414492c29bbf5288dfeea58fd6851ee01a1da6d8d66f5c31268982d69573e77&")
            .setFooter({ text: 'Rymbo' });

        interaction.reply({ embeds: [embed] });
    }
};
