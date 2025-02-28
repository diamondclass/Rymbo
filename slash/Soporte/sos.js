const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { dataRequired } = require('../../functions');
const ms = require('ms');
const Blacklist = require('../../schemas/blacklist');
const cooldowns = new Map();
module.exports = {
  data: new SlashCommandBuilder()
    .setName('sos')
    .setDescription('Haz un pedido de ayuda')
    .addStringOption(option => option.setName('message').setDescription('Razón del SOS').setRequired(true)),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        if (user && user.removedAt == null) return true;
        return false;
      } catch (err) {
        return false;
      }
    }
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    const reason = interaction.options.getString('message');
    if (!reason) return interaction.reply({ content: 'No especificaste la razón del SOS. Uso: /sos <message>', ephemeral: true });
    const now = Date.now();
    const cooldownAmount = 5 * 60 * 1000;
    if (cooldowns.has(interaction.user.id)) {
      const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.reply({ content: `Por favor, espera ${timeLeft.toFixed(1)} segundos antes de usar el comando SOS de nuevo.`, ephemeral: true });
      }
    }
    cooldowns.set(interaction.user.id, now);
    setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('send_sos')
        .setLabel('Enviar SOS')
        .setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: 'Estás a punto de enviar ese mensaje a los agentes de Rymbo (el personal de la agencia lo leerá).\n\nPara continuar, haz clic en el botón de abajo. Ten en cuenta que el mal uso puede resultar en un blacklist.', components: [row] });
    const replyMessage = await interaction.fetchReply();
    const filter = i => i.user.id === interaction.user.id;
    const collector = replyMessage.createMessageComponentCollector({ filter, time: 1000000 });
    collector.on('collect', async i => {
      if (i.customId === 'send_sos') {
        const sosEmbed = new EmbedBuilder().setColor("#00ADEF").setDescription(reason).setTitle('<:Checkmark:1278179814339252299> Solicitud enviada');
        await i.reply({ embeds: [sosEmbed], ephemeral: true });
        let invite;
        try {
          invite = await interaction.channel.createInvite({ maxAge: 0, maxUses: 1 });
        } catch (e) {
          invite = { url: 'No se pudo crear la invitación' };
        }
        interaction.client.channels.cache.get("1277357469076815912").send({
          content: `@everyone ${invite.url}`,
          embeds: [
            sosEmbed.setTitle('<:Alert:1278748088789504082> SOS <:Alert:1278748088789504082>')
              .setAuthor({ name: `${interaction.user.tag}, ${interaction.user.id}`, iconURL: interaction.user.displayAvatarURL() })
              .setFooter({ text: `${interaction.guild.name}, ${interaction.guild.id}`, iconURL: interaction.guild.iconURL() })
          ]
        });
        collector.stop();
      }
    });
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({ content: 'Tiempo de espera agotado. No se envió el SOS.' });
      }
    });
  }
};
