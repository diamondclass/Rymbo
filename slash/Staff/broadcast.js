const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Envía un mensaje a todos los servidores donde está el bot.')
    .addStringOption(option => option.setName('mensaje').setDescription('El mensaje a enviar').setRequired(true)),
  async execute(interaction) {
    const requiredRoleId = '1278189594596348010';
    const allowedGuildId = '1277353130518122538';
    const allowedGuild = interaction.client.guilds.cache.get(allowedGuildId);
    if (!allowedGuild) return interaction.reply({ content: 'El servidor permitido no se encuentra disponible.', ephemeral: true });
    const member = allowedGuild.members.cache.get(interaction.user.id);
    if (!member || !member.roles.cache.has(requiredRoleId)) return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
    const broadcastMessage = interaction.options.getString('mensaje');
    if (!broadcastMessage) return interaction.reply({ content: 'Por favor, proporciona el mensaje que deseas enviar.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('<:Info:1280303272472875021> Anuncio Global')
      .setDescription(broadcastMessage)
      .setColor('Blue')
      .setFooter({ text: `Rymbo | Por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });
    interaction.client.guilds.cache.forEach(guild => {
      const channel = guild.channels.cache.find(ch =>
        ch.type === ChannelType.GuildText &&
        ch.permissionsFor(guild.members.me)?.has(PermissionsBitField.Flags.SendMessages)
      );
      if (channel) channel.send({ embeds: [embed] }).catch(err => console.error(`No se pudo enviar mensaje a ${guild.name}: ${err}`));
    });
    return interaction.reply({ content: 'Mensaje enviado a todos los servidores.', ephemeral: true });
  }
};
