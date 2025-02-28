const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario en diferentes formatos y permite descargarlo.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario cuyo avatar deseas ver')
                .setRequired(false)
        ),
    async execute(interaction, _guild) {
        const Blacklist = require('../../schemas/blacklist'); 
        async function isUserBlacklisted(client, userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                return user && user.removedAt == null;
            } catch (err) {
                return false;
            }
        }

        const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
        if (isBlacklisted) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }

        const user = interaction.options.getUser('usuario') || interaction.user;

        const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });
        const avatarFormats = {
            webp: user.displayAvatarURL({ extension: 'webp', size: 1024 }),
            png: user.displayAvatarURL({ extension: 'png', size: 1024 }),
            jpg: user.displayAvatarURL({ extension: 'jpg', size: 1024 })
        };

        const embed = new EmbedBuilder()
            .setColor('#00ADEF')
            .setTitle(`Avatar de ${user.tag}`)
            .setImage(avatarURL)
            .setDescription(`[WEBP](${avatarFormats.webp}) | [PNG](${avatarFormats.png}) | [JPG](${avatarFormats.jpg})`)
            .setFooter({ text: 'Rymbo' });

        await interaction.reply({ embeds: [embed] });
    }
};
