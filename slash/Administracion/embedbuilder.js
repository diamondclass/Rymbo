const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField, EmbedBuilder, Events } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedbuilder')
        .setDescription('Crea un embed personalizado.'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Necesitas permisos de __Administrador__.', ephemeral: true });
        }
        
        const modal = new ModalBuilder()
            .setCustomId('embedBuilderModal')
            .setTitle('Crear un Embed');
        
        const titleInput = new TextInputBuilder()
            .setCustomId('embedTitle')
            .setLabel('Título del embed')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const descriptionInput = new TextInputBuilder()
            .setCustomId('embedDescription')
            .setLabel('Descripción del embed')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        
        const colorInput = new TextInputBuilder()
            .setCustomId('embedColor')
            .setLabel('Color en formato HEX (#RRGGBB)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const authorInput = new TextInputBuilder()
            .setCustomId('embedAuthor')
            .setLabel('Autor del embed (opcional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const footerInput = new TextInputBuilder()
            .setCustomId('embedFooter')
            .setLabel('Pie de página (opcional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(authorInput),
            new ActionRowBuilder().addComponents(footerInput)
        );
        
        await interaction.showModal(modal);
    }
};

module.exports.modalHandler = async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'embedBuilderModal') return;
    
    try {
        const title = interaction.fields.getTextInputValue('embedTitle');
        const description = interaction.fields.getTextInputValue('embedDescription');
        let color = interaction.fields.getTextInputValue('embedColor') || '#F0F0F0';
        const author = interaction.fields.getTextInputValue('embedAuthor') || null;
        const footer = interaction.fields.getTextInputValue('embedFooter') || null;

        if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) {
            return interaction.reply({ content: 'El color ingresado no es válido. Usa el formato HEX (#RRGGBB).', ephemeral: true });
        }
        color = parseInt(color.replace('#', ''), 16);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);

        if (author) embed.setAuthor({ name: author });
        if (footer) embed.setFooter({ text: footer });

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Hubo un error al procesar el embed.', ephemeral: true });
    }
};
