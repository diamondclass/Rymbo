const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { dataRequired, fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('apelar')
    .setDescription('Apela tu blacklist')
    .addStringOption(option => option.setName('contenido').setDescription('Razón y pruebas para apelar').setRequired(true))
    .addStringOption(option => option.setName('imagen').setDescription('URL de imagen (opcional)').setRequired(false)),
  async execute(interaction, _guild) {
    const appealContent = interaction.options.getString('contenido');
    const imageURL = interaction.options.getString('imagen');
    const filter = i => i.user.id === interaction.user.id;
    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('send_appeal').setLabel('Enviar Apelación').setStyle(ButtonStyle.Primary)
    );
    const promptEmbed = new EmbedBuilder()
      .setColor(0x00ADEF)
      .setDescription('¿Deseas enviar la apelación? Haz clic en el botón de abajo para continuar.');
    await interaction.reply({ embeds: [promptEmbed], components: [buttonRow], ephemeral: false });
    const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: 'BUTTON', time: 15000 });
    collector.on('collect', async i => {
      if (i.customId === 'send_appeal') {
        const appealEmbed = new EmbedBuilder()
          .setColor(0x00ADEF)
          .setTitle('Tu apelación ha sido enviada con éxito.')
          .setDescription(appealContent)
          .setAuthor({ name: `${interaction.user.tag}, ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setFooter({ text: `${interaction.guild.name}, ${interaction.guild.id}`, iconURL: interaction.guild.iconURL() });
        if (imageURL) appealEmbed.setImage(imageURL);
        await i.update({ embeds: [appealEmbed], components: [] });
        interaction.client.channels.cache.get("1277357469076815912").send({ embeds: [appealEmbed] });
        collector.stop();
      }
    });
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: 'Tiempo de espera agotado. No se envió la apelación.', ephemeral: false });
      }
    });
    let userDB = await fecthUsersDataBase(interaction.client, interaction.user);
    if (userDB && userDB.achievements.data.bugs >= 2 && !userDB.achievements.array.includes('Cazador de maliciosos.')) {
      interaction.followUp({ content: 'Acabas de obtener un logro, mira tu perfil.', ephemeral: false });
      userDB.achievements.array.push('Cazador de maliciosos.');
      userDB.save();
    }
  }
};
