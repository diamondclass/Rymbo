const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stafflist')
    .setDescription('Muestra la lista completa del equipo staff del servidor')
    .setDMPermission(false),
    
  async execute(interaction) {
    // Configuración personalizable
    const config = {
      guildId: '1277353130518122538',       // ID de tu servidor
      staffRoleId: '1278189594596348010',   // ID del rol staff
      embedColor: '#2b2d31',                // Color del embed
      footerIcon: true                      // Mostrar icono del servidor en el footer
    };

    // Verificar servidor
    if (interaction.guild.id !== config.guildId) {
      return interaction.reply({
        content: '⚠️ Este comando solo está disponible en el servidor oficial',
        ephemeral: true
      });
    }

    try {
      // Obtener datos actualizados
      const guild = await interaction.guild.fetch();
      const role = await guild.roles.fetch(config.staffRoleId);
      
      if (!role) {
        return interaction.reply({
          content: '❌ No se encontró el rol de staff configurado',
          ephemeral: true
        });
      }

      // Actualizar caché de miembros
      await guild.members.fetch({ withPresences: true });
      
      // Procesar miembros
      const staffMembers = role.members
        .sort((a, b) => b.roles.highest.position - a.roles.highest.position)
        .map(member => `• ${member.toString()} - \`${member.user.tag}\` (${member.roles.cache.size - 1} roles)`);

      // Construir embed
      const embed = new EmbedBuilder()
        .setTitle(`👥 Equipo Staff - ${staffMembers.length} miembros`)
        .setColor(config.embedColor)
        .setDescription(staffMembers.join('\n') || '🚨 No se encontraron miembros staff')
        .setFooter({
          text: `Lista actualizada el ${new Date().toLocaleDateString()}`,
          iconURL: config.footerIcon ? guild.iconURL({ dynamic: true }) : null
        })
        .setThumbnail(guild.iconURL({ size: 512 }));

      // Enviar respuesta
      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error en comando stafflist:', error);
      await interaction.reply({
        content: '❌ Error al generar la lista de staff',
        ephemeral: true
      });
    }
  }
};
