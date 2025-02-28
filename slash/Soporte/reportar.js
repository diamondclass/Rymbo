const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
const _reportar = new EmbedBuilder().setColor(0x00ADEF);
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reportar')
    .setDescription('Reporta a alguien.')
    .addUserOption(option => option.setName('usuario').setDescription('El usuario a reportar').setRequired(true))
    .addStringOption(option => option.setName('razon').setDescription('Razón del reporte').setRequired(true))
    .addStringOption(option => option.setName('prueba').setDescription('Prueba del reporte').setRequired(true)),
  async execute(interaction) {
    async function isUserBlacklisted(userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    const reportedUser = interaction.options.getUser('usuario');
    const razon = interaction.options.getString('razon');
    const prueba = interaction.options.getString('prueba');
    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00ADEF)
      .setTitle('Confirmar Reporte')
      .setDescription(`**Usuario reportado:** ${reportedUser.tag} (${reportedUser.id})\n**Razón:** ${razon}\n**Prueba:** ${prueba}\n\n¿Deseas enviar este reporte?`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 15000 });
    collector.on('collect', async i => {
      if (i.customId === 'confirm') {
        _reportar.setDescription(`**Usuario reportado:** ${reportedUser.tag} (${reportedUser.id})\n**Razón:** ${razon}\n**Prueba:** ${prueba}`)
          .setTitle('Tu reporte ha sido enviado con éxito.');
        const reportEmbed = new EmbedBuilder()
          .setColor(0x00ADEF)
          .setTitle('Reporte Enviado')
          .setDescription(`**Usuario reportado:** ${reportedUser.tag} (${reportedUser.id})\n**Razón:** ${razon}\n**Prueba:** ${prueba}`)
          .setAuthor({ name: `${interaction.user.tag}, ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setFooter({ text: `${interaction.guild.name}, ${interaction.guild.id}`, iconURL: interaction.guild.iconURL() });
        await i.update({ content: 'Tu reporte ha sido enviado.', embeds: [], components: [] });
        interaction.client.channels.cache.get("1277357469076815912").send({ embeds: [reportEmbed] });
        collector.stop();
      } else if (i.customId === 'cancel') {
        await i.update({ content: 'Reporte cancelado.', embeds: [], components: [] });
        collector.stop();
      }
    });
    collector.on('end', async collected => {
      if (!collected.size) {
        await interaction.editReply({ content: 'Tiempo expirado. Reporte cancelado.', components: [] });
      }
    });
    let userDB = await fecthUsersDataBase(interaction.client, interaction.user);
    if (userDB && userDB.achievements.data.bugs >= 2 && !userDB.achievements.array.includes('Cazador de maliciosos.')) {
      interaction.channel.send({ content: 'Acabas de obtener un logro, mira tu perfil.' });
      userDB.achievements.array.push('Cazador de maliciosos.');
      userDB.save();
    }
  }
};
