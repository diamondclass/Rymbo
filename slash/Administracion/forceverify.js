const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { dataRequired } = require("../../functions");
const Blacklist = require('../../schemas/blacklist');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forceverify')
        .setDescription('Verifica a un usuario nuevo en tu servidor.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Usuario a verificar')
                .setRequired(true)
        ),

    async execute(interaction, client, _guild) {
        async function isUserBlacklisted(client, userId) {
            try {
                const user = await Blacklist.findOne({ userId });
                return user && user.removedAt == null;
            } catch (err) {
                return false;
            }
        }

        const isBlacklisted = await isUserBlacklisted(client, interaction.user.id);
        if (isBlacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });

        try {
            if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({ content: 'El bot necesita el permiso de "Gestionar roles" para ejecutar este comando.', ephemeral: true });
            }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({ content: 'Necesitas el permiso de "Gestionar roles" para ejecutar este comando.', ephemeral: true });
            }

            const member = interaction.options.getMember('usuario');
            if (!member) {
                return interaction.reply({
                    content: 'Debes mencionar a un usuario para verificar. Ejemplo: `/forceverify @usuario`',
                    ephemeral: true
                });
            }

            if (_guild.protection.verification.enable === false) {
                return interaction.reply({ content: 'La verificación está deshabilitada en este servidor.', ephemeral: true });
            }
            if (member.roles.cache.has(_guild.protection.verification.role)) {
                return interaction.reply({ content: 'Este usuario ya está verificado.', ephemeral: true });
            }

            await member.roles.add(_guild.protection.verification.role);
            return interaction.reply({ content: 'El usuario ha sido verificado con éxito.', ephemeral: false });

        } catch (err) {
            console.error(err);
            return interaction.reply({ content: 'Hubo un error al intentar verificar al usuario.', ephemeral: true });
        }
    },
};
