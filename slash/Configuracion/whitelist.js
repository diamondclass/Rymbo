const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { updateDataBase } = require("../../functions");
const Blacklist = require('../../schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Gestiona la lista blanca de miembros o URLs.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        async function isUserBlacklisted(client, userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                return user && user.removedAt == null;
            } catch (err) {
                return false;
            }
        }

        const isBlacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
        if (isBlacklisted) return interaction.reply('No puedes usar este comando porque estás en la lista negra.');
        if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply('Solo el dueño del servidor puede usar este comando.');
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Necesitas permisos de __Administrador__.', ephemeral: true });

        let _guild = await getGuildData(interaction.guild.id); // Asegúrate de tener esta función
        let whitelist = _guild.configuration.whitelist;
        let whitelistText = whitelist.length > 0 
            ? whitelist.map(id => id.startsWith('http') ? `URL: ${id}` : `<@${id}> (${id})`).join('\n')
            : 'No hay entradas en la lista blanca.';

        const embed = new EmbedBuilder()
            .setTitle('Lista Blanca del servidor')
            .setDescription(`**Lista blanca actual:**\n${whitelistText}\n\nUsa los botones de abajo para gestionar la lista blanca.`)
            .setColor('#00ADEF')
            .setFooter({ text: 'Rymbo' });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('add_whitelist')
                .setLabel('Añadir a la whitelist')
                .setStyle('Success'),
            new ButtonBuilder()
                .setCustomId('remove_whitelist')
                .setLabel('Remover de la whitelist')
                .setStyle('Danger'),
            new ButtonBuilder()
                .setCustomId('clear_whitelist')
                .setLabel('Limpiar whitelist')
                .setStyle('Secondary')
        );

        await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: false });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 1000000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'add_whitelist') {
                await i.deferUpdate();
                const addMessage = await i.followUp({ content: 'Menciona un rol, escribe un ID de miembro o una URL para añadir a la whitelist.', ephemeral: true });

                const collected = await interaction.channel.awaitMessages({ filter: (m) => m.author.id === interaction.user.id, max: 1, time: 30000 });

                if (!collected.size) return addMessage.edit({ content: 'No se recibió ninguna entrada.', ephemeral: true });

                let mention = collected.first().mentions.roles.first() || collected.first().content.trim();

                if (!isNaN(mention)) {
                    try {
                        let user = await interaction.client.users.fetch(mention);
                        if (_guild.configuration.whitelist.includes(user.id)) return addMessage.edit({ content: 'Ese miembro ya está en la lista blanca.', ephemeral: true });
                        _guild.configuration.whitelist.push(user.id);
                        updateDataBase(interaction.client, interaction.guild, _guild, true);
                        return addMessage.edit({ content: `Miembro con ID ${user.id} añadido a la lista blanca.`, ephemeral: true });
                    } catch (err) {
                        return addMessage.edit({ content: 'ID de miembro inválido o no encontrado.', ephemeral: true });
                    }
                }

                if (mention.startsWith('http')) {
                    if (_guild.configuration.whitelist.includes(mention)) return addMessage.edit({ content: 'Esa URL ya está en la lista blanca.', ephemeral: true });
                    _guild.configuration.whitelist.push(mention);
                    updateDataBase(interaction.client, interaction.guild, _guild, true);
                    return addMessage.edit({ content: `URL ${mention} añadida a la lista blanca.`, ephemeral: true });
                }

                if (mention && mention.name) {
                    if (_guild.configuration.whitelist.includes(mention.id)) return addMessage.edit({ content: 'Ese rol ya está en la lista blanca.', ephemeral: true });
                    _guild.configuration.whitelist.push(mention.id);
                    updateDataBase(interaction.client, interaction.guild, _guild, true);
                    return addMessage.edit({ content: `Rol ${mention.name} añadido a la lista blanca.`, ephemeral: true });
                } else {
                    return addMessage.edit({ content: 'Entrada inválida. Debes mencionar un rol, proporcionar un ID de miembro o una URL.', ephemeral: true });
                }

            } else if (i.customId === 'remove_whitelist') {
                await i.deferUpdate();
                if (whitelist.length === 0) return i.followUp({ content: 'No hay entradas en la lista blanca para eliminar.', ephemeral: true });

                let removeOptions = whitelist.map(id => ({
                    label: id.startsWith('http') ? `URL: ${id}` : `ID: ${id}`,
                    description: 'Selecciona para remover.',
                    value: `remove_${id}`
                }));

                const removeMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('remove_whitelist_select')
                        .setPlaceholder('Selecciona un elemento para remover')
                        .addOptions(removeOptions)
                );

                let removeMessage = await i.followUp({ content: 'Selecciona un elemento de la lista blanca para remover.', components: [removeMenu], ephemeral: true });

                const removeCollector = removeMessage.createMessageComponentCollector({ time: 30000 });
                removeCollector.on('collect', async (selectInteraction) => {
                    let idToRemove = selectInteraction.values[0].split('_')[1];
                    _guild.configuration.whitelist = _guild.configuration.whitelist.filter((id) => id !== idToRemove);
                    updateDataBase(interaction.client, interaction.guild, _guild, true);
                    await selectInteraction.update({ content: `Eliminado de la lista blanca.`, components: [], ephemeral: true });
                });

            } else if (i.customId === 'clear_whitelist') {
                await i.deferUpdate();
                _guild.configuration.whitelist = [];
                updateDataBase(interaction.client, interaction.guild, _guild, true);
                i.followUp({ content: 'Lista blanca limpiada.', ephemeral: true });
            }
        });
    },
};
