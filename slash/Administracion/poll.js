const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Crea una encuesta con opciones personalizadas.')
        .addStringOption(option =>
            option.setName('pregunta')
                .setDescription('La pregunta de la encuesta')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tiempo')
                .setDescription('Duración de la encuesta (ej: 1d, 12h, 30m)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('opcion1')
                .setDescription('Primera opción de la encuesta')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('opcion2')
                .setDescription('Segunda opción de la encuesta')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('opcion3')
                .setDescription('Tercera opción (opcional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('opcion4')
                .setDescription('Cuarta opción (opcional)')
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: '🔒 Necesitas el permiso `MANAGE_GUILD` para usar este comando.', ephemeral: true });
        }
        const pregunta = interaction.options.getString('pregunta');
        const tiempo = interaction.options.getString('tiempo');
        const opciones = ['opcion1', 'opcion2', 'opcion3', 'opcion4']
            .map(opt => interaction.options.getString(opt))
            .filter(Boolean);
        if (opciones.length < 2) {
            return interaction.reply({ content: '❌ Debes proporcionar al menos dos opciones.', ephemeral: true });
        }
        const convertirTiempo = (time) => {
            const unidades = { d: 86400, h: 3600, m: 60, s: 1 };
            const match = time.match(/(\d+)([dhms])/);
            return match ? parseInt(match[1]) * unidades[match[2]] * 1000 : null;
        };
        const duracion = convertirTiempo(tiempo);
        if (!duracion || duracion > 2419200000) {
            return interaction.reply({ content: '❌ Duración inválida. Usa formato: `1d`, `12h`, `30m`', ephemeral: true });
        }
        const votes = {};
        opciones.forEach((_, index) => {
            votes[`opcion${index + 1}`] = new Set();
        });
        const actualizarEmbed = () => {
            const totalVotos = Object.values(votes).reduce((acc, set) => acc + set.size, 0);
            return new EmbedBuilder()
                .setTitle(`📌 ${interaction.guild.name}`)
                .setDescription(`**Encuesta:**\n${pregunta}`)
                .addFields(opciones.map((opcion, index) => ({
                    name: `${opcion} [${votes[`opcion${index + 1}`].size}]`,
                    value: '▰'.repeat(votes[`opcion${index + 1}`].size) + '▱'.repeat(10 - votes[`opcion${index + 1}`].size),
                    inline: false
                })))
                .setColor(0x00ADEF)
                .setTimestamp();
        };
        const botones = new ActionRowBuilder().addComponents(
            opciones.map((opcion, index) =>
                new ButtonBuilder()
                    .setCustomId(`poll_opcion${index + 1}`)
                    .setLabel(opcion)
                    .setStyle(ButtonStyle.Primary)
            )
        );
        const mensaje = await interaction.reply({
            embeds: [actualizarEmbed()],
            components: [botones],
            fetchReply: true
        });
        const collector = mensaje.createMessageComponentCollector({ time: duracion });
        collector.on('collect', async i => {
            Object.keys(votes).forEach(opcion => votes[opcion].delete(i.user.id));
            votes[i.customId].add(i.user.id);
            await i.update({ embeds: [actualizarEmbed()], components: [botones] });
        });
        collector.on('end', () => {
            mensaje.edit({ components: [] }).catch(() => {});
        });
    }
};
