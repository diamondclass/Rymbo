const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('md')
    .setDescription('Prepara un mensaje directo con un embed editable y permite confirmar o cancelar el envío.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que deseas enviar el mensaje')
        .setRequired(true)
    ),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'Servidor permitido no disponible.', ephemeral: true });
    const staffMember = allowedGuild.members.cache.get(interaction.user.id);
    if (!staffMember || !staffMember.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('usuario');
    if (!targetUser) return interaction.reply({ content: 'No se pudo encontrar el usuario.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('Mensaje de Administración')
      .setDescription('Escribe en este chat la descripción que deseas incluir en el mensaje.')
      .setColor('#F0F0F0')
      .setFooter({ text: 'Mensaje enviado por Rymbo' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle('Success'),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle('Danger')
    );
    const msg = await interaction.reply({ content: 'Por favor, escribe una nueva descripción para el mensaje directo.', embeds: [embed], components: [row], fetchReply: true });
    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        try {
          await targetUser.send({ embeds: [embed] });
          await i.update({ content: 'Mensaje enviado exitosamente.', embeds: [], components: [] });
        } catch (error) {
          await i.update({ content: 'Hubo un error al enviar el mensaje directo.', embeds: [], components: [] });
        }
        collector.stop();
      } else if (i.customId === 'cancel') {
        await i.update({ content: 'Envio cancelado.', embeds: [], components: [] });
        collector.stop();
      }
    });
    collector.on('end', async () => {
      await msg.edit({ components: [] });
    });
    const channelCollector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 60000 });
    channelCollector.on('collect', async m => {
      embed.setDescription(m.content);
      await msg.edit({ embeds: [embed] });
      await m.delete().catch(() => {});
    });
    channelCollector.on('end', () => {
      if (!collector.ended) msg.edit({ components: [] });
    });
  }
};
