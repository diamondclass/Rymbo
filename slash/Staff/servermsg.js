const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { pulk, fecthDataBase, updateDataBase } = require('../../functions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('servermsg')
    .setDescription('Envía un embed a un servidor específico en el canal configurado como logs o random.')
    .addStringOption(option =>
      option.setName('serverid')
        .setDescription('ID del servidor')
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
    const serverId = interaction.options.getString('serverid');
    const targetGuild = interaction.client.guilds.cache.get(serverId);
    if (!targetGuild) return interaction.reply({ content: 'No se pudo encontrar el servidor especificado.', ephemeral: true });
    const _guild = await fecthDataBase(interaction.client, targetGuild, false);
    if (!_guild) return interaction.reply({ content: 'No se pudo cargar la configuración del servidor.', ephemeral: true });
    let targetChannel;
    if (_guild.configuration.logs) {
      targetChannel = targetGuild.channels.cache.get(_guild.configuration.logs);
    }
    if (!targetChannel) {
      targetChannel = targetGuild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText &&
        channel.permissionsFor(targetGuild.members.me).has(PermissionsBitField.Flags.SendMessages)
      );
    }
    if (!targetChannel) return interaction.reply({ content: 'No se encontró un canal accesible en el servidor.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('Mensaje desde Administración')
      .setDescription('Escribe un mensaje en este chat para cambiar esta descripción.')
      .setColor('#F0F0F0')
      .setFooter({ text: 'Creado por Rymbo' });
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle('Success'),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle('Danger')
    );
    await interaction.reply({ content: 'Modifica la descripción del embed escribiendo en este chat, luego confirma o cancela.', embeds: [embed], components: [actionRow] });
    const msg = await interaction.fetchReply();
    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });
    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        try {
          await targetChannel.send({ embeds: [embed] });
          await i.reply({ content: 'Mensaje enviado al canal del servidor especificado.', ephemeral: true });
          await msg.delete();
        } catch (error) {
          await i.reply({ content: 'Error al enviar el mensaje al canal.', ephemeral: true });
        }
      } else if (i.customId === 'cancel') {
        await i.reply({ content: 'Operación cancelada.', ephemeral: true });
        await msg.delete();
      }
    });
    collector.on('end', async () => {
      await msg.edit({ components: [] });
    });
    const descriptionCollector = interaction.channel.createMessageCollector({
      filter: m => m.author.id === interaction.user.id,
      time: 60000
    });
    descriptionCollector.on('collect', async m => {
      embed.setDescription(m.content);
      await msg.edit({ embeds: [embed] });
      await m.delete().catch(() => {});
    });
    descriptionCollector.on('end', () => {
      if (!collector.ended) {
        msg.edit({ components: [] });
      }
    });
  }
};
