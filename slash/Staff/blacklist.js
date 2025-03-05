const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Gestiona la lista negra de usuarios.')
    .addStringOption(option =>
      option.setName('accion')
        .setDescription('Acción a realizar: add, remove, info, list')
        .setRequired(true)
        .addChoices(
          { name: 'add', value: 'add' },
          { name: 'remove', value: 'remove' },
          { name: 'info', value: 'info' },
          { name: 'list', value: 'list' }
        ))
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID del usuario')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón (requerido para add y remove)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('prueba')
        .setDescription('Prueba (requerido para add)')
        .setRequired(false)),

  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';

    if (!interaction.guild || interaction.guild.id !== allowedGuildId) {
      return interaction.reply({ content: 'Este comando solo puede usarse en el servidor autorizado.', ephemeral: true });
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
    }

    const action = interaction.options.getString('accion');
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('razon');
    const proof = interaction.options.getString('prueba');
    const staffId = interaction.user.id;

    if (!['add', 'remove', 'info', 'list'].includes(action)) {
      return interaction.reply({ content: 'Acción no válida. Usa `add`, `remove`, `info` o `list`.', ephemeral: true });
    }

    if (['add', 'remove', 'info'].includes(action) && !userId) {
      return interaction.reply({ content: 'Debes proporcionar un `userId` para esta acción.', ephemeral: true });
    }

    if (action === 'add') {
      if (!reason || !proof) {
        return interaction.reply({ content: 'Para añadir a un usuario a la lista negra, debes proporcionar `razón` y `prueba`.', ephemeral: true });
      }

      const existingEntry = await Blacklist.findOne({ userId });
      if (existingEntry) {
        return interaction.reply({ content: 'Este usuario ya está en la lista negra.', ephemeral: true });
      }

      try {
        await new Blacklist({ userId, reason, proof, staffId }).save();
        return interaction.reply({ content: `Usuario <@${userId}> añadido a la lista negra.`, ephemeral: false });
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Error al añadir al usuario.', ephemeral: true });
      }
    }

    if (action === 'remove') {
      const result = await Blacklist.deleteOne({ userId });

      if (result.deletedCount === 0) {
        return interaction.reply({ content: 'El usuario no está en la lista negra.', ephemeral: true });
      }

      return interaction.reply({ content: `Usuario <@${userId}> eliminado de la lista negra.`, ephemeral: false });
    }

    if (action === 'info') {
      const entry = await Blacklist.findOne({ userId });

      if (!entry) {
        return interaction.reply({ content: 'Este usuario no está en la lista negra.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle('Información de Lista Negra')
        .addFields(
          { name: 'ID del Usuario', value: entry.userId, inline: true },
          { name: 'Razón', value: entry.reason, inline: true },
          { name: 'Prueba', value: entry.proof, inline: true },
          { name: 'Añadido por', value: `<@${entry.staffId}>`, inline: true },
          { name: 'Fecha', value: new Date(entry.addedAt).toLocaleDateString(), inline: true }
        )
        .setFooter({ text: 'Sistema de Moderación' });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (action === 'list') {
      const blacklist = await Blacklist.find();
      if (blacklist.length === 0) {
        return interaction.reply({ content: 'No hay usuarios en la lista negra.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle('Lista de Usuarios en Lista Negra')
        .setDescription(blacklist.map(entry => `**ID:** ${entry.userId} - **Razón:** ${entry.reason}`).join('\n'))
        .setFooter({ text: 'Sistema de Moderación' });

      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};
