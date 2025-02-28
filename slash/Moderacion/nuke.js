const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ComponentType, PermissionsBitField } = require('discord.js');
const Blacklist = require('../../schemas/blacklist');

async function isUserBlacklisted(client, userId) {
  try {
    const user = await Blacklist.findOne({ userId });
    return user && user.removedAt == null;
  } catch (err) {
    console.error('Error buscando en la blacklist:', err);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Elimina todos los mensajes del canal clonándolo (nuke).'),
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'Necesito permisos para gestionar canales.', ephemeral: true });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: 'Necesitas permisos para gestionar canales.', ephemeral: true });
    }
    const confirmEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('<:Alert:1278748088789504082> ¡Cuidado!')
      .setDescription('Estás a punto de recrear este canal. Si estás seguro de continuar, haz clic en el botón "Confirmar". Si no, haz clic en "Cancelar".')
      .setFooter({ text: 'Esta acción no se puede deshacer.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirmar')
        .setLabel('Confirmar')
        .setStyle('Success'),
      new ButtonBuilder()
        .setCustomId('cancelar')
        .setLabel('Cancelar')
        .setStyle('Danger')
    );
    await interaction.reply({ embeds: [confirmEmbed], components: [row] });
    const msg = await interaction.fetchReply();
    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 15000
      });
      if (buttonInteraction.customId === 'confirmar') {
        const oldChannel = interaction.channel;
        const channelPosition = oldChannel.position;
        const parentId = oldChannel.parentId;
        const nukeChannel = await oldChannel.clone({ parent: parentId, position: channelPosition });
        await oldChannel.delete();
        await nukeChannel.setPosition(channelPosition);
        const successEmbed = new EmbedBuilder()
          .setColor('#F0F0F0')
          .setDescription('<:Checkmark:1278179814339252299> | El canal ha sido nukeado con éxito.')
          .setImage('https://media1.tenor.com/m/-awrYWaCuvoAAAAd/explosion-explode.gif')
          .setFooter({ text: 'Acción completada.' });
        await nukeChannel.send({ embeds: [successEmbed] });
        await buttonInteraction.update({ content: 'Canal nukeado.', embeds: [], components: [] });
      } else if (buttonInteraction.customId === 'cancelar') {
        await buttonInteraction.update({ content: 'La acción ha sido cancelada.', embeds: [], components: [] });
      }
    } catch (err) {
      await interaction.editReply({ content: 'La acción ha expirado o ha sido cancelada.', components: [] });
    }
  }
};
