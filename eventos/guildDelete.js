const { EmbedBuilder } = require('discord.js');
const Guild = require('../schemas/guildsSchema');

module.exports = async (client, guild) => {
    try {
        await Guild.findOneAndDelete({ id: guild.id });
        const logChannel = await client.channels.fetch("1277357469076815912");
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setThumbnail(guild.iconURL())
                .setTitle('Me han expulsado de un servidor.')
                .addFields(
                    { name: 'Servidor', value: `${guild.name} (${guild.id})` },
                    { name: 'Idioma', value: `${guild.preferredLocale}` },
                    { name: 'Roles', value: `${guild.roles.cache.size}` },
                    { name: 'Miembros', value: `${guild.memberCount}` }
                )
                .setTimestamp()
                .setColor("#00ADEF")
                .setFooter({ text: guild.name, iconURL: guild.iconURL() });
            await logChannel.send({ embeds: [embed] }).catch(err => console.error('Error enviando la notificación de expulsión:', err));
        }
        const myUserId = "1216532655592439862";
        const user = await client.users.fetch(myUserId);
        if (user) {
            const embed = new EmbedBuilder()
                .setTitle('El bot ha sido expulsado de un servidor.')
                .addFields(
                    { name: 'Servidor', value: `${guild.name} (${guild.id})` },
                    { name: 'Idioma', value: `${guild.preferredLocale}` },
                    { name: 'Roles', value: `${guild.roles.cache.size}` },
                    { name: 'Miembros', value: `${guild.memberCount}` }
                )
                .setTimestamp()
                .setColor("#FF0000");
            await user.send({ embeds: [embed] }).catch(err => console.error('Error enviando el MD sobre expulsión:', err));
        }
    } catch (err) {
        console.error('Error manejando el evento guildDelete:', err);
    }
};
