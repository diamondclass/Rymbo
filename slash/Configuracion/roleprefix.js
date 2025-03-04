const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const Blacklist = require('../../schemas/blacklist'); 

const RolePrefixSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefixes: { type: Map, of: String, default: {} }
});
const RolePrefix = mongoose.model('RolePrefixSlash', RolePrefixSchema);

async function isUserBlacklisted(userId) {
    try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt === null;
    } catch (err) {
        return false;
    }
}

function getMemberPrefix(member, prefixes) {
    let highestPrefix = '';
    let highestPosition = -1;
    member.roles.cache.forEach(role => {
        if (prefixes.has(role.id) && role.position > highestPosition) {
            highestPrefix = prefixes.get(role.id);
            highestPosition = role.position;
        }
    });
    return highestPrefix;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleprefix')
        .setDescription('Configura o elimina el prefijo para un rol.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Configura un prefijo para un rol.')
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Rol al que asignar el prefijo.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prefijo')
                        .setDescription('Prefijo a asignar.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina el prefijo de un rol.')
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Rol del que eliminar el prefijo.')
                        .setRequired(true))),

    async execute(interaction) {
        const blacklisted = await isUserBlacklisted(interaction.user.id);
        if (blacklisted) {
            return interaction.reply({
                content: 'No puedes usar este comando porque estás en la lista negra.',
                ephemeral: true
            });
        }

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'No tienes permisos suficientes para usar este comando.',
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('rol');
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const prefix = interaction.options.getString('prefijo');

            try {
                let guildPrefix = await RolePrefix.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $set: { [`prefixes.${role.id}`]: prefix } },
                    { new: true, upsert: true }
                );

                await interaction.reply({
                    content: `Prefijo "${prefix}" configurado para el rol ${role}.`,
                    ephemeral: false
                });

                role.members.forEach(member => {
                    const newPrefix = getMemberPrefix(member, guildPrefix.prefixes);
                    const newName = newPrefix ? `${newPrefix} ${member.user.username}` : member.user.username;
                    member.setNickname(newName).catch(() => {});
                });
            } catch (error) {
                console.error('Error al configurar el prefijo:', error);
                await interaction.reply({
                    content: 'Hubo un error al intentar configurar el prefijo.',
                    ephemeral: true
                });
            }
        } else if (subcommand === 'remove') {
            try {
                const guildPrefix = await RolePrefix.findOne({ guildId: interaction.guild.id });
                if (!guildPrefix || !guildPrefix.prefixes.has(role.id)) {
                    return interaction.reply({
                        content: 'No se encontró un prefijo configurado para este rol.',
                        ephemeral: true
                    });
                }

                guildPrefix.prefixes.delete(role.id);
                await guildPrefix.save();
                await interaction.reply({
                    content: `Prefijo eliminado para el rol ${role}.`,
                    ephemeral: false
                });

                role.members.forEach(member => {
                    const newPrefix = getMemberPrefix(member, guildPrefix.prefixes);
                    const newName = newPrefix ? `${newPrefix} ${member.user.username}` : member.user.username;
                    member.setNickname(newName).catch(() => {});
                });
            } catch (error) {
                console.error('Error al eliminar el prefijo:', error);
                await interaction.reply({
                    content: 'Hubo un error al intentar eliminar el prefijo.',
                    ephemeral: true
                });
            }
        }
    }
};
