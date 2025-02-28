const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { dataRequired, updateDataBase, fecthDataBase } = require('../../functions');
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
    .setName('purge')
    .setDescription('Borra mensajes en el canal actual o especificado')
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de mensajes a borrar (1-1000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000)
    )
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Filtrar mensajes por usuario')
    )
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal específico para borrar mensajes')
    )
    .addRoleOption(option =>
      option.setName('rol')
        .setDescription('Filtrar mensajes por rol')
    )
    .addBooleanOption(option =>
      option.setName('bots')
        .setDescription('Borrar solo mensajes de bots')
    )
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del borrado (opcional)')
    ),
  
  async execute(interaction) {
    if (await isUserBlacklisted(interaction.client, interaction.user.id)) {
      return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'No tengo permisos para gestionar mensajes en este servidor.', ephemeral: true });
    }
    
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: 'No tienes permisos para gestionar mensajes.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('cantidad');
    const user = interaction.options.getUser('usuario');
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const role = interaction.options.getRole('rol');
    const bots = interaction.options.getBoolean('bots');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';

    if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: `No tengo permisos para gestionar mensajes en ${channel}.`, ephemeral: true });
    }

    try {
      const messages = await channel.messages.fetch({ limit: Math.min(amount, 1000) });
      
      const filtered = messages.filter(msg => {
        if (user && msg.author.id !== user.id) return false;
        if (bots !== null && msg.author.bot !== bots) return false;
        if (role && !msg.member?.roles.cache.has(role.id)) return false;
        return true;
      });

      if (filtered.size === 0) {
        return interaction.reply({ content: 'No se encontraron mensajes que coincidan con los filtros.', ephemeral: true });
      }

      const messagesToDelete = filtered.first(Math.min(filtered.size, amount));
      const chunks = [];
      
      for (let i = 0; i < messagesToDelete.size; i += 100) {
        chunks.push(messagesToDelete.slice(i, i + 100));
      }

      let totalDeleted = 0;
      
      for (const chunk of chunks) {
        const deleted = await channel.bulkDelete(chunk, true);
        totalDeleted += deleted.size;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const response = [
        `✅ Se borraron ${totalDeleted} mensajes en ${channel}`,
        `• **Razón:** ${reason}`,
        user ? `• **Usuario:** ${user.tag}` : '',
        role ? `• **Rol:** ${role.name}` : '',
        bots !== null ? `• **Bots:** ${bots ? 'Solo' : 'Excluidos'}` : ''
      ].filter(line => line).join('\n');

      await interaction.reply({ content: response, ephemeral: false });

    } catch (error) {
      console.error('Error al borrar mensajes:', error);
      await interaction.reply({ content: 'Ocurrió un error al intentar borrar los mensajes.', ephemeral: true });
    }
  }
};