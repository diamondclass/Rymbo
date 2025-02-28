const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// bill, pa q pusiste comentarios¿ xd
module.exports = {
  data: new SlashCommandBuilder()
    .setName('stafflist')
    .setDescription('Muestra la lista completa del equipo staff del servidor')
    .setDMPermission(false),
    
  async execute(interaction) {
    const config = {
      guildId: '1277353130518122538',       
      staffRoleId: '1278189594596348010',   
      embedColor: '#2b2d31',               
      footerIcon: true                      
    };

    if (interaction.guild.id !== config.guildId) {
      return interaction.reply({
        content: '⚠️ Este comando solo está disponible en el servidor oficial',
        ephemeral: true
      });
    }

    try {
      const guild = await interaction.guild.fetch();
      const role = await guild.roles.fetch(config.staffRoleId);
      
      if (!role) {
        return interaction.reply({
          content: '❌ No se encontró el rol de staff configurado',
          ephemeral: true
        });
      }

      await guild.members.fetch({ withPresences: true });
      
      const staffMembers = role.members
        .sort((a, b) => b.roles.highest.position - a.roles.highest.position)
        .map(member => `• ${member.toString()} - \`${member.user.tag}\` (${member.roles.cache.size - 1} roles)`);

      const embed = new EmbedBuilder()
        .setTitle(`👥 Equipo Staff - ${staffMembers.length} miembros`)
        .setColor(config.embedColor)
        .setDescription(staffMembers.join('\n') || '🚨 No se encontraron miembros staff')
        .setFooter({
          text: `Lista actualizada el ${new Date().toLocaleDateString()}`,
          iconURL: config.footerIcon ? guild.iconURL({ dynamic: true }) : null
        })
        .setThumbnail(guild.iconURL({ size: 512 }));

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
