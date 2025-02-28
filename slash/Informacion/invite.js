const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitar')
        .setDescription('Invítame a tu servidor.'),

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
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }

        const inviteEmbed = new EmbedBuilder()
            .setColor('#00ADEF')
            .setTitle('<a:matches:992411238644584488> ¡Invítame a tu servidor!')
            .setDescription('Gracias por considerar invitarme a tu servidor. Estoy aquí para mejorar la gestión de tu comunidad con funciones útiles y automatizaciones seguras. Haz click en los botones para invitarme o ver nuestra web.')
            .setImage('https://cdn.discordapp.com/attachments/1313338210642034738/1313345956586061864/Untitled_Project11.jpg?ex=675074fc&is=674f237c&hm=c30e33286c1b6cf3ce6d655409bb0432075e3dfa7760c0dc14bc38e05f444c4e&')
            .setFooter({ text: 'Rymbo' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invitame')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.com/oauth2/authorize?client_id=1277124708369961021&permissions=8&integration_type=0&scope=bot+applications.commands'),
                new ButtonBuilder()
                    .setLabel('Página web')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.kwikxdev.com')
            );

        await interaction.reply({ embeds: [inviteEmbed], components: [row], ephemeral: true });
    }
};
