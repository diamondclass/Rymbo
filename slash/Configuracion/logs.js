const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Registra eventos en tu servidor dentro de un canal.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Habilita el registro de eventos en un canal específico.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('El canal donde se registrarán los eventos.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Deshabilita el registro de eventos en el servidor.')
        ),
    async execute(interaction, _guild) {
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

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'No tienes permisos suficientes para usar este comando.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'enable') {
            if (_guild.configuration.logs[0]) {
                return interaction.reply({ content: 'El registro ya está habilitado en otro canal.', ephemeral: true });
            }
            const channelMention = interaction.options.getChannel('channel');
            if (!channelMention.isTextBased()) {
                return interaction.reply({ content: 'El canal mencionado no es de texto.', ephemeral: true });
            }
            _guild.configuration.logs = [channelMention.id, interaction.channel.id];
            updateDataBase(interaction.client, interaction.guild, _guild, true);
            interaction.reply({ content: `El registro de eventos ha sido habilitado en ${channelMention}.` });
        } else if (subcommand === 'disable') {
            if (!_guild.configuration.logs[0]) {
                return interaction.reply({ content: 'El registro de eventos no está habilitado.', ephemeral: true });
            }
            _guild.configuration.logs = [];
            updateDataBase(interaction.client, interaction.guild, _guild, true);
            interaction.reply({ content: 'El registro de eventos ha sido deshabilitado.' });
        }
    }
};
