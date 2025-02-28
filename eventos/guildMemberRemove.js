const Guild = require('../schemas/guildsSchema');
const { EmbedBuilder } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');

module.exports = async (client, member) => {
    let _guild = await fecthDataBase(client, member.guild, false);
    if (!_guild) return;
    try {
        if (_guild.configuration.logs[0]) {
            const logChannel = client.channels.cache.get(_guild.configuration.logs[0]);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor("#00ADEF")
                    .setTitle("📝 Alguien ha salido")
                    .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() })
                    .addFields({ name: "Usuario:", value: `\`${member.user.username} (${member.user.id})\``, inline: true })
                    .setTimestamp();
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (err) {
        const errorChannel = client.channels.cache.get(_guild.configuration.logs[1]);
        if (errorChannel) {
            await errorChannel.send({ content: `Logs error (guildMemberRemove): \`${err}\`` });
        }
        _guild.configuration.logs = [];
        updateDataBase(client, member.guild, _guild, true);
    }
};
