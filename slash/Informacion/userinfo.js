const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información sobre un usuario.')
        .addUserOption(option => option.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),
    async execute(interaction) {
        async function isUserBlacklisted(userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                console.log("Resultado de la búsqueda de blacklist:", user);
                if (user && user.removedAt == null) return true;
                return false;
            } catch (err) {
                console.error('Error buscando en la blacklist:', err);
                return false;
            }
        }
        if (await isUserBlacklisted(interaction.user.id)) {
            return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.' });
        }
        let user = interaction.options.getUser('usuario') || interaction.user;
        if (!user) {
            return interaction.reply({ content: 'No se pudo encontrar al usuario.' });
        }
        let member = interaction.guild.members.cache.get(user.id) || null;
        const _userinfo = new EmbedBuilder()
            .setColor(0x00ADEF)
            .setTitle(`<a:crown_uo:992411806033264742> Información de Usuario: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Nombre de Usuario', value: user.tag, inline: true },
                { name: 'ID', value: user.id, inline: true },
                { name: 'Estado', value: member ? (member.presence ? member.presence.status : 'No disponible') : 'Usuario no en el servidor', inline: true },
                { name: 'Fecha de Creación', value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`, inline: true },
                { name: 'Fecha de Ingreso al Servidor', value: member ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'No está en el servidor', inline: true }
            )
            .setFooter({ text: 'Rymbo' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Avatar').setStyle(ButtonStyle.Link).setURL(user.displayAvatarURL({ dynamic: true, size: 1024 })),
            new ButtonBuilder().setLabel('Roles').setCustomId('roles').setStyle(ButtonStyle.Primary).setDisabled(!member)
        );
        await interaction.reply({ embeds: [_userinfo], components: [row] });
        const message = await interaction.fetchReply();
        const filter = i => i.customId === 'roles' && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 1000000 });
        collector.on('collect', async i => {
            await i.deferUpdate();
            const roles = member.roles.cache.filter(role => role.id !== interaction.guild.id).map(role => role.name).join(', ') || 'Sin roles';
            await i.followUp({ content: `Roles de ${user.tag}: ${roles}`, ephemeral: true });
        });
    }
};
