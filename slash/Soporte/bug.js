const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug')
    .setDescription('¿Alguna bug sobre el bot?')
    .addStringOption(option => option.setName('mensaje').setDescription('Mensaje del bug').setRequired(true)),

  async execute(interaction) {
    const isUserBlacklisted = async (userId) => {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    };

    if (await isUserBlacklisted(interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: false });
    }

    const bugMsg = interaction.options.getString('mensaje');
    await interaction.reply({ content: 'Gracias por tu reporte. Escribe "enviar" para confirmar.', ephemeral: false });

    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

    collector.on('collect', async (m) => {
      if (!m.content) return;
      if (m.content.toLowerCase() === 'enviar') {
        const bugEmbed = new EmbedBuilder()
          .setColor(0x00ADEF)
          .setTitle('Bug reportado')
          .setDescription(bugMsg)
          .setAuthor({ name: `${interaction.user.tag} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setFooter({ text: `${interaction.guild.name} (${interaction.guild.id})`, iconURL: interaction.guild.iconURL() });

        await interaction.followUp({ embeds: [bugEmbed], ephemeral: false });
        interaction.client.channels.cache.get("1277357469076815912").send({ embeds: [bugEmbed] });
        collector.stop();
      } else {
        interaction.channel.send({ content: 'Reporte cancelado.' });
        collector.stop();
      }
    });
  }
};
