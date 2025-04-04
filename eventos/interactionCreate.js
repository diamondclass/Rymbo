const Guild = require('../schemas/guildsSchema');
const { selectMenu, pulk, fecthDataBase, updateDataBase } = require('../functions');
const { EmbedBuilder } = require('discord.js');
const embedbuilder = require('../slash/Administracion/embedbuilder'); 

module.exports = async (client, interaction) => {
    let _guild = await fecthDataBase(client, interaction.guild, false);
    if (!_guild) return;
    
    if (interaction.customId === 'newPage' || interaction.customId === 'returnPage') return;

    try {
        if (interaction.isSelectMenu()) {
            await selectMenu(interaction, interaction.values[0], client);
        } else if (interaction.isButton()) {
            if (interaction.customId === 'verifyButton') {
                if (_guild.protection.verification.enable && _guild.protection.verification._type === '--v3') {
                    await interaction.reply({ content: '<:Checkmark:1278179814339252299>  | ¡Has sido verificado!', ephemeral: true });
                    interaction.member.roles.add(_guild.protection.verification.role).catch(err => {
                        client.channels.cache.get(_guild.protection.verification.channel).send({ content: 'Error al agregarte el rol.\n\n`' + err + '`', ephemeral: true });
                    });
                }
            } else if (interaction.customId === 'unmuteAll') {
                if (!interaction.member.permissions.has('ADMINISTRATOR')) return interaction.reply({ content: 'Necesitas permisos de __Administrador__.', ephemeral: true });
                let count = 0;
                _guild.moderation.dataModeration.timers.forEach(async x => {
                    try {
                        _guild.moderation.dataModeration.timers = await pulk(_guild.moderation.dataModeration.timers, x);
                        x.endAt = Math.random();
                        x.inputTime = '0s';
                        _guild.moderation.dataModeration.timers.push(x);
                        setTimeout(() => {
                            updateDataBase(client, interaction.guild, _guild, true);
                        }, 120000 * count++);
                    } catch (err) {}
                });
                interaction.reply({ content: 'Todos los usuarios serán desmuteados a lo largo del día.' });
            } else if (interaction.customId === 'dontRepeatTheAutomoderatorAction') {
                if (!interaction.member.permissions.has('ADMINISTRATOR')) return interaction.reply({ content: 'Necesitas permisos de __Administrador__.', ephemeral: true });
                _guild.configuration.subData.dontRepeatTheAutomoderatorAction = !_guild.configuration.subData.dontRepeatTheAutomoderatorAction;
                interaction.reply({ content: _guild.configuration.subData.dontRepeatTheAutomoderatorAction ? 'No volveré a mutear/banear/expulsar a alguien cuando tenga demasiadas infracciones.' : 'Comenzaré a mutear/banear/expulsar a alguien cuando tenga demasiadas infracciones.', ephemeral: true });
            }
        } else if (interaction.isModalSubmit()) {
            await embedbuilder.modalHandler(interaction);
        }
    } catch (err) {
        console.error(err);
    }

    updateDataBase(client, interaction.guild, _guild, true);
};
