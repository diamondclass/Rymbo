const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fecthUsersDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('votar')
    .setDescription('Vota por nosotros en las botlists.'),
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
    let user = await fecthUsersDataBase(interaction.client, interaction.user, false);
    if (!user) return interaction.reply({ content: 'Error: Tu documento en la base de datos no está definido.', ephemeral: true });
    user = { premium: {} };
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Votar en botlist.me').setStyle(ButtonStyle.Link).setURL('https://botlist.me/bots/1277124708369961021'),
      new ButtonBuilder().setLabel('Votar en ExtremeBotlist').setStyle(ButtonStyle.Link).setURL('https://discordextremelist.xyz/en-US/bots/1277124708369961021'),
      new ButtonBuilder().setLabel('Votar en Top.GG').setStyle(ButtonStyle.Link).setURL('https://top.gg/bot/1277124708369961021'),
      new ButtonBuilder().setLabel('Votar en DiscordBots').setStyle(ButtonStyle.Link).setURL('https://discord.bots.gg/bots/1277124708369961021'),
      new ButtonBuilder().setLabel('Votar en DiscordBotlist.com').setStyle(ButtonStyle.Link).setURL('https://discordbotlist.com/bots/Rymbo')
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Votar en Radarcord').setStyle(ButtonStyle.Link).setURL('https://radarcord.net/bot/1277124708369961021')
    );
    const embed = new EmbedBuilder()
      .setColor(user.premium.isActive ? '#00ADEF' : '#00ADEF')
      .setTitle('<:Vote:1279668030833430619> ¡Vota por nosotros!')
      .setDescription('¡Hey, ya somos internacionales! Ahora estamos en las llamadas botlist, son páginas donde puedes buscar bots y votar por ellos para mejorar su reputación.\n\n**Vota por nosotros en los botones**')
      .setFooter({ text: 'Rymbo' });
    await interaction.reply({ embeds: [embed], components: [row1, row2] });
  }
};
