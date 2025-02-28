const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Gestiona la lista negra de usuarios.')
    .addStringOption(option =>
      option.setName('accion')
        .setDescription('Acción a realizar: add, remove, info')
        .setRequired(true)
        .addChoices(
          { name: 'add', value: 'add' },
          { name: 'remove', value: 'remove' },
          { name: 'info', value: 'info' }
        ))
    .addStringOption(option =>
      option.setName('userid')
        .setDescription('ID del usuario')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón (requerido para add y remove)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('prueba')
        .setDescription('Prueba (requerido para add y remove)')
        .setRequired(false)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) {
      return interaction.reply({ content: 'El servidor especificado no se encuentra disponible.', ephemeral: true });
    }
    const member = allowedGuild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const action = interaction.options.getString('accion');
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('razon');
    const proof = interaction.options.getString('prueba');
    const staffId = interaction.user.id;
    if (!['add', 'remove', 'info'].includes(action)) {
      return interaction.reply({ content: 'Uso incorrecto. Usa `add`, `remove` o `info` como primer argumento.', ephemeral: true });
    }
    if (!userId) {
      return interaction.reply({ content: 'Debes proporcionar un `userId`.', ephemeral: true });
    }
    if ((action === 'add' || action === 'remove') && (!reason || !proof)) {
      return interaction.reply({ content: `Para ${action} en la lista negra, debes proporcionar \`razon\` y \`prueba\`.`, ephemeral: true });
    }
    if (action === 'add') {
      try {
        const newEntry = new Blacklist({
          userId,
          reason,
          proof,
          staffId
        });
        await newEntry.save();
        return interaction.reply({ content: `Usuario con ID \`${userId}\` añadido a la lista negra.`, ephemeral: false });
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Error al añadir al usuario a la lista negra.', ephemeral: true });
      }
    } else if (action === 'remove') {
      try {
        const result = await Blacklist.deleteOne({ userId });
        if (result.deletedCount > 0) {
          return interaction.reply({ content: `Usuario con ID \`${userId}\` removido de la lista negra.`, ephemeral: false });
        } else {
          return interaction.reply({ content: 'No se encontró al usuario en la lista negra.', ephemeral: true });
        }
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Error al remover al usuario de la lista negra.', ephemeral: true });
      }
    } else if (action === 'info') {
      try {
        const entry = await Blacklist.findOne({ userId });
        if (entry) {
          const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle('Información del Usuario en Lista Negra')
            .addFields(
              { name: 'ID del Usuario', value: entry.userId, inline: true },
              { name: 'Razón', value: entry.reason, inline: true },
              { name: 'Prueba', value: entry.proof, inline: true },
              { name: 'Añadido el', value: new Date(entry.addedAt).toLocaleDateString(), inline: true },
              { name: 'Añadido por', value: `<@${entry.staffId}>`, inline: true }
            )
            .setFooter({ text: 'Rymbo' });
          return interaction.reply({ embeds: [embed], ephemeral: false });
        } else {
          return interaction.reply({ content: 'No se encontró información para este usuario en la lista negra.', ephemeral: true });
        }
      } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'Error al obtener la información del usuario.', ephemeral: true });
      }
    }
  }
};
