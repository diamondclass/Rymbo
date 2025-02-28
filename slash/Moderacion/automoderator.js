const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { dataRequired, pulk, updateDataBase, fecthDataBase } = require('../../functions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('automoderator')
    .setDescription('El bot moderará automáticamente tu servidor.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Activa el automoderador'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Desactiva el automoderador'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('label')
        .setDescription('Muestra la configuración actual del automoderador'))
    .addSubcommandGroup(group =>
      group
        .setName('setevent')
        .setDescription('Configura los eventos del automoderador')
        .addSubcommand(sub =>
          sub
            .setName('badworddetect')
            .setDescription('Configura el evento badwordDetect')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('flooddetect')
            .setDescription('Configura el evento floodDetect')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('manypings')
            .setDescription('Configura el evento manyPings')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('capitalletters')
            .setDescription('Configura el evento capitalLetters')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('manyemojis')
            .setDescription('Configura el evento manyEmojis')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('manywords')
            .setDescription('Configura el evento manyWords')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('linkdetect')
            .setDescription('Configura el evento linkDetect')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('ghostping')
            .setDescription('Configura el evento ghostPing')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('nsfwfilter')
            .setDescription('Configura el evento nsfwFilter')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' })))
        .addSubcommand(sub =>
          sub
            .setName('iploggerfilter')
            .setDescription('Configura el evento iploggerFilter')
            .addStringOption(option =>
              option
                .setName('action')
                .setDescription('enable o disable')
                .setRequired(true)
                .addChoices({ name: 'enable', value: 'enable' }, { name: 'disable', value: 'disable' }))))
    .addSubcommandGroup(group =>
      group
        .setName('editactions')
        .setDescription('Edita las acciones del automoderador')
        .addSubcommand(sub =>
          sub
            .setName('warns')
            .setDescription('Configura la cantidad de warns para mutear y sancionar')
            .addIntegerOption(option =>
              option.setName('mutewarns').setDescription('Cantidad de warns para mutear').setRequired(true))
            .addIntegerOption(option =>
              option.setName('banwarns').setDescription('Cantidad de warns para sancionar (kick/ban)').setRequired(true)))
        .addSubcommand(sub =>
          sub
            .setName('mutetime')
            .setDescription('Configura el tiempo de muteo')
            .addStringOption(option =>
              option.setName('time').setDescription('Tiempo de muteo (ej. 2m, 30s)').setRequired(true)))
        .addSubcommand(sub =>
          sub
            .setName('lastaction')
            .setDescription('Configura la acción final (KICK o BAN)')
            .addStringOption(option =>
              option.setName('action')
                .setDescription('Acción: KICK o BAN')
                .setRequired(true)
                .addChoices({ name: 'KICK', value: 'KICK' }, { name: 'BAN', value: 'BAN' })))
        .addSubcommand(sub =>
          sub
            .setName('ignorelink')
            .setDescription('Edita los links a ignorar')
            .addStringOption(option =>
              option.setName('mode')
                .setDescription('Modo: add, remove, clearall')
                .setRequired(true)
                .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'clearall', value: 'clearall' }))
            .addStringOption(option =>
              option.setName('link')
                .setDescription('Link o extensión (solo para add o remove)')
                .setRequired(false))))
,
  async execute(interaction) {
    // Cargar la configuración del servidor desde la base de datos.
    let _guild = await fecthDataBase(interaction.client, interaction.guild, false);
    if (!_guild) return interaction.reply({ content: 'No se pudo cargar la configuración del servidor.', ephemeral: true });
    // Verificar permisos de Administrador.
    if (!interaction.guild.members.me.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'Necesito permiso de Administrador.', ephemeral: true });
    }
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({ content: 'Necesitas permiso de Administrador.', ephemeral: true });
    }
    if (!_guild.moderation.dataModeration.muterole) {
      return interaction.reply({ content: `Se debe especificar el rol de muteo con **setmuterole <roleMention>**\``, ephemeral: true });
    }
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    if (!subcommandGroup) {
      // Subcomandos: enable, disable, label.
      const sub = interaction.options.getSubcommand();
      if (sub === 'enable') {
        if (_guild.moderation.automoderator.enable === true)
          return interaction.reply({ content: 'El automoderador ya está activo.', ephemeral: true });
        _guild.moderation.automoderator.enable = true;
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: 'He activado el automoderador, si aún no lo configuraste usará datos por defecto, puedes cambiarlos con la función `setEvent`.', ephemeral: false });
      } else if (sub === 'disable') {
        if (_guild.moderation.automoderator.enable === false)
          return interaction.reply({ content: 'El automoderador ya está desactivado.', ephemeral: true });
        _guild.moderation.automoderator.enable = false;
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: 'He desactivado el automoderador, la configuración quedará guardada.', ephemeral: false });
      } else if (sub === 'label') {
        const embed = new EmbedBuilder()
          .setColor('#00ADEF')
          .setDescription(`Moderador activo: \`${_guild.moderation.automoderator.enable ? 'Sí' : 'No'}\``)
          .addFields(
            { name: 'Acciones:', value: `Cuando un usuario tenga \`${_guild.moderation.automoderator.actions.warns[0]}\` warns lo mutearé durante \`${_guild.moderation.automoderator.actions.muteTime[1]} (${_guild.moderation.automoderator.actions.muteTime[0]}ms)\`.\nCuando un usuario tenga \`${_guild.moderation.automoderator.actions.warns[1]}\` warns le sancionaré con un \`${_guild.moderation.automoderator.actions.action}\`` },
            { name: 'Sistemas:', value:
                `badwordDetect: \`${_guild.moderation.automoderator.events.badwordDetect ? 'Activado' : 'Desactivado'}\`\n` +
                `floodDetect: \`${_guild.moderation.automoderator.events.floodDetect ? 'Activado' : 'Desactivado'}\`\n` +
                `manyPings: \`${_guild.moderation.automoderator.events.manyPings ? 'Activado' : 'Desactivado'}\`\n` +
                `capitalLetters: \`${_guild.moderation.automoderator.events.capitalLetters ? 'Activado' : 'Desactivado'}\`\n` +
                `manyEmojis: \`${_guild.moderation.automoderator.events.manyEmojis ? 'Activado' : 'Desactivado'}\`\n` +
                `manyWords: \`${_guild.moderation.automoderator.events.manyWords ? 'Activado' : 'Desactivado'}\`\n` +
                `linkDetect: \`${_guild.moderation.automoderator.events.linkDetect ? 'Activado' : 'Desactivado'}\`\n` +
                `ghostPing: \`${_guild.moderation.automoderator.events.ghostping ? 'Activado' : 'Desactivado'}\`\n` +
                `nsfwFilter: \`${_guild.moderation.automoderator.events.nsfwFilter ? 'Activado' : 'Desactivado'}\`\n` +
                `iploggerFilter: \`${_guild.moderation.automoderator.events.iploggerFilter ? 'Activado' : 'Desactivado'}\``
            }
          );
        return interaction.reply({ embeds: [embed], ephemeral: false });
      } else {
        return interaction.reply({ content: 'Subcomando no válido.', ephemeral: true });
      }
    } else if (subcommandGroup === 'setevent') {
      const eventType = interaction.options.getSubcommand(); // e.g., badworddetect, flooddetect, etc.
      const action = interaction.options.getString('action');
      const validActions = ['enable', 'disable'];
      if (!validActions.includes(action)) {
        return interaction.reply({ content: 'La acción debe ser "enable" o "disable".', ephemeral: true });
      }
      const eventMapping = {
        badworddetect: 'badwordDetect',
        flooddetect: 'floodDetect',
        manypings: 'manyPings',
        capitalletters: 'capitalLetters',
        manyemojis: 'manyEmojis',
        manywords: 'manyWords',
        linkdetect: 'linkDetect',
        ghostping: 'ghostping',
        nsfwfilter: 'nsfwFilter',
        iploggerfilter: 'iploggerFilter'
      };
      const eventKey = eventMapping[eventType];
      if (!eventKey) {
        return interaction.reply({ content: 'Evento no válido.', ephemeral: true });
      }
      _guild.moderation.automoderator.events[eventKey] = (action === 'enable');
      updateDataBase(interaction.client, interaction.guild, _guild, true);
      return interaction.reply({ content: `Evento ${eventKey} ${action === 'enable' ? 'activado' : 'desactivado'} con éxito.`, ephemeral: false });
    } else if (subcommandGroup === 'editactions') {
      const actionType = interaction.options.getSubcommand();
      if (actionType === 'warns') {
        const muteWarns = interaction.options.getInteger('mutewarns');
        const banWarns = interaction.options.getInteger('banwarns');
        if (banWarns <= muteWarns) {
          return interaction.reply({ content: 'La cantidad de warns para banear debe ser mayor que la cantidad para mutear.', ephemeral: true });
        }
        _guild.moderation.automoderator.actions.warns = [muteWarns, banWarns];
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: `Configuración de warns actualizada: Mutear a ${muteWarns} warns, sancionar a ${banWarns} warns.`, ephemeral: false });
      } else if (actionType === 'mutetime') {
        const timeInput = interaction.options.getString('time');
        let timeMs = ms(timeInput);
        if (!timeMs) {
          return interaction.reply({ content: 'Error: Tiempo no válido.', ephemeral: true });
        }
        if (timeMs < 120000) {
          timeMs = 120000;
        }
        _guild.moderation.automoderator.actions.muteTime = [timeMs, timeInput];
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: `Tiempo de muteo actualizado a \`${timeInput} (${timeMs}ms)\`.`, ephemeral: false });
      } else if (actionType === 'lastaction') {
        const lastAction = interaction.options.getString('action');
        if (!['KICK', 'BAN'].includes(lastAction)) {
          return interaction.reply({ content: 'La acción debe ser "KICK" o "BAN".', ephemeral: true });
        }
        _guild.moderation.automoderator.actions.action = lastAction;
        updateDataBase(interaction.client, interaction.guild, _guild, true);
        return interaction.reply({ content: `Acción final actualizada a ${lastAction}.`, ephemeral: false });
      } else if (actionType === 'ignorelink') {
        const mode = interaction.options.getString('mode');
        const link = interaction.options.getString('link');
        if (mode === 'add') {
          if (!link) return interaction.reply({ content: 'Debes proporcionar el link o la extensión que se ignorará.', ephemeral: true });
          _guild.moderation.automoderator.actions.linksToIgnore.push(link);
          updateDataBase(interaction.client, interaction.guild, _guild, true);
          return interaction.reply({ content: `A partir de ahora ignoraré links que incluyan \`${link}\`.`, ephemeral: false });
        } else if (mode === 'remove') {
          if (!link) return interaction.reply({ content: 'Debes proporcionar el link o la extensión a remover.', ephemeral: true });
          const index = _guild.moderation.automoderator.actions.linksToIgnore.indexOf(link);
          if (index === -1) {
            return interaction.reply({ content: 'El link especificado no se encuentra en la lista.', ephemeral: true });
          }
          _guild.moderation.automoderator.actions.linksToIgnore.splice(index, 1);
          updateDataBase(interaction.client, interaction.guild, _guild, true);
          return interaction.reply({ content: `El link \`${link}\` ha sido eliminado de la lista.`, ephemeral: false });
        } else if (mode === 'clearall') {
          _guild.moderation.automoderator.actions.linksToIgnore = [];
          updateDataBase(interaction.client, interaction.guild, _guild, true);
          return interaction.reply({ content: 'Todos los links a ignorar han sido eliminados.', ephemeral: false });
        } else {
          return interaction.reply({ content: 'Modo no válido. Usa "add", "remove" o "clearall".', ephemeral: true });
        }
      } else {
        return interaction.reply({ content: 'Subcomando no válido en editActions.', ephemeral: true });
      }
    } else {
      return interaction.reply({ content: 'Función no válida. Usa: automoderator {enable, disable, label, setEvent { ... }, editActions { ... } }', ephemeral: true });
    }
  }
};
