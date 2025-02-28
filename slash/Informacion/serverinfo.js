const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra información detallada sobre el servidor.'),
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
        const server = interaction.guild;
        const totalTextChannels = server.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const totalVoiceChannels = server.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const totalNewsChannels = server.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
        const totalCategoryChannels = server.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const totalEmojis = server.emojis.cache.size;
        const serverOwner = await server.fetchOwner();
        const boostLevel = server.premiumTier || 'Ninguno';
        const totalBoosts = server.premiumSubscriptionCount || '0';
        const embed = new EmbedBuilder()
            .setColor(0x00ADEF)
            .setTitle(server.name)
            .setThumbnail(server.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '<a:a_info:954249339243462696> General', value: `**Miembros:** ${server.memberCount}\n**Roles:** ${server.roles.cache.size}\n**Creado el:** <t:${Math.floor(server.createdAt.getTime() / 1000)}:F>\n**Región:** ${server.preferredLocale}\n**Nivel de Verificación:** ${server.verificationLevel}\n**Nivel de Boost:** ${boostLevel} (${totalBoosts} Boosts)\n**Propietario:** ${serverOwner.user.tag}` },
                { name: '<:uo_add:1015553154533838879> Canales', value: `**Texto:** ${totalTextChannels}\n**Voz:** ${totalVoiceChannels}\n**Noticias:** ${totalNewsChannels}\n**Categorías:** ${totalCategoryChannels}` },
                { name: '<:fun:992383624462729246>  Emojis', value: `${totalEmojis}` }
            )
            .setFooter({ text: `Server ID: ${server.id}` });
        if (server.bannerURL()) {
            embed.setImage(server.bannerURL({ dynamic: true, size: 1024 }));
        }
        const buttons = [];
        if (server.iconURL()) {
            buttons.push(new ButtonBuilder().setLabel('Server Icon').setStyle(ButtonStyle.Link).setURL(server.iconURL({ dynamic: true, size: 1024 })));
        }
        buttons.push(new ButtonBuilder().setLabel('Roles').setCustomId('roles').setStyle(ButtonStyle.Primary));
        buttons.push(new ButtonBuilder().setLabel('Emojis').setCustomId('emojis').setStyle(ButtonStyle.Primary));
        const row = new ActionRowBuilder().addComponents(buttons);
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        const message = await interaction.fetchReply();
        const filter = i => (i.customId === 'roles' || i.customId === 'emojis') && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 1000000 });
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId === 'roles') {
                const roles = server.roles.cache
                    .filter(role => role.id !== server.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => `<@&${role.id}>`)
                    .join(', ') || 'Sin roles';
                const rolesEmbed = new EmbedBuilder()
                    .setTitle('<:school1:954251695788011560> Roles del servidor')
                    .setDescription(roles)
                    .setColor(0x00ADEF)
                    .setFooter({ text: `Total de roles: ${server.roles.cache.size - 1}` });
                await i.followUp({ embeds: [rolesEmbed], ephemeral: true });
            } else if (i.customId === 'emojis') {
                const emojis = server.emojis.cache
                    .map(emoji => emoji.toString())
                    .join(' ') || 'Sin emojis';
                const emojisEmbed = new EmbedBuilder()
                    .setTitle('<:fun:992383624462729246> Emojis del servidor')
                    .setDescription(emojis)
                    .setColor(0x00ADEF)
                    .setFooter({ text: `Total de emojis: ${totalEmojis}` });
                await i.followUp({ embeds: [emojisEmbed], ephemeral: true });
            }
        });
    }
};
