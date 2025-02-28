const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function getCommandNames(folderPath) {
  try {
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    return commandFiles.map(file => path.basename(file, '.js'));
  } catch (error) {
    console.error(`Error leyendo la carpeta ${folderPath}:`, error);
    return [];
  }
}

const commandsPath = path.join(__dirname, '../../slash');

const categorias = {
  "Soporte": getCommandNames(path.join(commandsPath, 'Soporte')),
  "Protección": getCommandNames(path.join(commandsPath, 'Proteccion')),
  "Diversión": getCommandNames(path.join(commandsPath, 'Diversion')),
  "Moderación": getCommandNames(path.join(commandsPath, 'Moderacion')),
  "Información": getCommandNames(path.join(commandsPath, 'Informacion')),
  "Configuración": getCommandNames(path.join(commandsPath, 'Configuracion')),
  "Administración": getCommandNames(path.join(commandsPath, 'Administracion')),
  "Otros": getCommandNames(path.join(commandsPath, 'Otros')),
  "Staff": getCommandNames(path.join(commandsPath, 'Staff'))
};

function createHelpEmbed() {
  return new EmbedBuilder()
    .setColor("#00ADEF")
    .setTitle('<a:a_happy:953694657370542190> ¡Bienvenido al menú de ayuda!')
    .setDescription(`¿Estás perdido? ¡Estás en el lugar correcto! 🎉\n\n` +
      `- Usa el menú desplegable de abajo para navegar por las categorías.\n` +
      `- <a:voted:992415801103614063> Comienza usando mirando mis comandos en el menú de abajo.\n` +
      `- <a:verified_developer:992387826572333056> ¿Dudas? Contacta al soporte haciendo clic [aquí](https://discord.gg/a7FqNnHk2m).`)
    .setImage("https://cdn.discordapp.com/attachments/1313338210642034738/1329266812734541959/rymbo-banner.jpg")
    .setFooter({ 
      text: "Rymbo", 
      iconURL: 'https://cdn.discordapp.com/attachments/1313338210642034738/1329267863701159947/Rymbo.png'
    });
}

function createCategoryEmbed(category) {
  const data = categorias[category];
  const embed = new EmbedBuilder()
    .setColor("#00ADEF")
    .setFooter({ 
      text: "Rymbo", 
      iconURL: 'https://cdn.discordapp.com/attachments/1313338210642034738/1329267863701159947/Rymbo.png'
    })
    .setTitle(`📚 ${category}`);
  if (data.length > 0) {
    embed.setDescription(`**Comandos disponibles (${data.length}):**\n\n\`\`\`${data.join(', ')}\`\`\``);
  } else {
    embed.setDescription("🚫 No hay comandos disponibles en esta categoría");
  }
  return embed;
}

function createSelectMenuOptions(member) {
  const categories = ["Soporte", "Protección", "Moderación", "Diversión", "Información", "Configuración", "Administración", "Otros"];
  if (member?.roles.cache.has('1278189594596348010')) {
    categories.push("Staff");
  }
  return categories.map(cat => ({
    label: cat,
    value: cat.toLowerCase(),
    description: `Ver comandos de ${cat}`
  }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Obtén ayuda sobre el bot y sus comandos.'),
  async execute(interaction) {
    const embedHelp = createHelpEmbed();
    const options = createSelectMenuOptions(interaction.member);
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('categorySelect')
        .setPlaceholder('Selecciona una categoría')
        .addOptions(options)
    );
    const response = await interaction.reply({ 
      embeds: [embedHelp], 
      components: [selectMenu],
      fetchReply: true 
    });
    const filter = i => i.customId === 'categorySelect' && i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 300000 });
    collector.on('collect', async i => {
      const selectedCategory = i.values[0];
      const newEmbed = createCategoryEmbed(options.find(opt => opt.value === selectedCategory).label);
      await i.update({ embeds: [newEmbed] });
    });
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  }
};
