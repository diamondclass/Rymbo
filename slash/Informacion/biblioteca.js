const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { dataRequired } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

async function isUserBlacklisted(userId) {
    try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt == null;
    } catch {
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('biblioteca')
        .setDescription('Muestra información sobre un comando.')
        .addStringOption(option => 
            option.setName('comando')
                .setDescription('Nombre del comando')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (await isUserBlacklisted(interaction.user.id)) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
        }

        const commandName = interaction.options.getString('comando');
        const cmd = interaction.client.commands.get(commandName) || interaction.client.commands.find(f => f.aliases && f.aliases.includes(commandName));
        
        if (!cmd) {
            return interaction.reply({ content: 'Comando no encontrado.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#5c4fff')
            .setTitle(`Comando: ${cmd.data.name}`)
            .setDescription(cmd.data.description || 'Sin descripción')
            .addFields(
                { name: 'Categoría', value: cmd.category || 'No especificada', inline: true },
                { name: 'Premium', value: cmd.premium ? 'Sí' : 'No', inline: true },
                { name: 'Alias', value: cmd.aliases ? cmd.aliases.join(', ') : 'Ninguno', inline: true },
                { name: 'Uso', value: `/${cmd.data.name} ${cmd.data.options.map(opt => `<${opt.name}>`).join(' ')}`, inline: false }
            )
            .setImage('https://cdn.discordapp.com/attachments/1313338210642034738/1313343139116744714/Untitled_Project10.jpg');

        interaction.reply({ embeds: [embed] });
    }
};
