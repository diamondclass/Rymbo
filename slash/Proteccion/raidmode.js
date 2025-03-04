const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const ms = require('ms');
const { dataRequired, updateDataBase } = require('../../functions');
const Blacklist = require('../../schemas/blacklist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('¿Te amenazan con raidear tu servidor? Con este sistema nadie podrá tocarte.')
    .addStringOption(option => option.setName('time').setDescription('Tiempo para desactivar el sistema (ej: 30d)')),
  async execute(interaction, _guild) {
    async function isUserBlacklisted(client, userId) {
      try {
        const user = await Blacklist.findOne({ userId });
        return user && user.removedAt == null;
      } catch (err) {
        return false;
      }
    }
    const blacklisted = await isUserBlacklisted(interaction.client, interaction.user.id);
    if (blacklisted) return interaction.reply({ content: 'No puedes usar este comando porque estás en la lista negra.', ephemeral: true });
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: 'Necesito permiso de Administrador.', ephemeral: true });
    if (interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ content: 'Necesitas ser el propietario de este servidor.', ephemeral: true });

    if (!_guild.protection) _guild.protection = {};
    if (!_guild.protection.raidmode) _guild.protection.raidmode = { enable: false };
    if (!_guild.configuration) _guild.configuration = { prefix: '!' };

    if (_guild.protection.raidmode.enable === false) {
      try {
        let password = `${Math.floor(Math.random() * 9999999999)}`;
        await interaction.user.send({ content: 'Contraseña para desactivar el sistema raidmode: `' + password + '`' })
          .then(dm => dm.pin())
          .catch(err => {
            return interaction.reply({ content: 'Primero abre tus privados.', ephemeral: true });
          });
        let timeStr = interaction.options.getString('time') || '30d';
        if (!interaction.options.getString('time')) {
          await interaction.followUp({ content: await dataRequired('Es posible ingresar un tiempo para que el sistema se desactive, por defecto: 30d.\n\n/raidmode [time]'), ephemeral: true });
        }
        let timeVal = ms(timeStr);
        if (timeVal < ms('30d')) {
          timeVal = ms('30d');
          timeStr = '30d';
        }
        _guild.protection.raidmode.timeToDisable = timeVal;
        _guild.protection.raidmode.enable = true;
        _guild.protection.raidmode.password = password;
        _guild.protection.raidmode.activedDate = Date.now();
        _guild.protection.antiraid = { enable: true };
        _guild.protection.antibots = { enable: true, _type: 'all' };
        _guild.protection.intelligentAntiflood = true;
        _guild.protection.antiflood = true;
        _guild.protection.purgeWebhooksAttacks = { enable: true };
        _guild.protection.bloqNewCreatedUsers = { enable: true, time: '30d' };
        _guild.protection.antitokens = { enable: true };
        _guild.protection.cannotEnterTwice = { enable: true };
        _guild.protection.warnEntry = true;
        _guild.protection.kickMalicious = { enable: true };
        _guild.protection.webhookCache = {};
        const embed = new EmbedBuilder()
          .setColor("#00ADEF")
          .setDescription('`>` __Raidmode preparado:__\n\n1 :: Solo el propietario puede gestionar canales.\n2 :: Solo el propietario puede banear miembros.\n3 :: Solo el propietario puede gestionar roles.\n4 :: Solo el propietario puede desactivar este comando.\n5 :: Nadie puede añadir bots.\n6 :: Ningún usuario malicioso puede ingresar al servidor.\n7 :: Todas las cuentas que ingresen al servidor deben tener 30 días de antigüedad.')
          .addFields(
            { name: '> Detección de usuarios y forceban:', value: 'He activado dos comandos que pueden interesarte: `/forceban` y `/detectar`' },
            { name: '> Sistemas activados a la fuerza:', value: 'Los siguientes sistemas fueron activados forzosamente: Antiraid, intelligentAntiflood, Antiflood, purgeWebhooksAttacks, bloqNewCreatedUsers, Antitokens, warnEntry, kickMalicious, Antibots' },
            { name: '> Cuidado al desactivarlo:', value: 'El sistema raidmode es muy exigente, para desactivarlo deberás escribir la contraseña que se te ha enviado por privado. Si al escribirla fallas la contraseña se desactivará y se sumarán 10 días hasta que se desactive el raidmode.' }
          );
        await interaction.reply({ content: `He activado el sistema, para desactivarlo vuelve a escribir el comando.\nEl sistema raidmode será desactivado automáticamente en \`${ms(timeVal)}\`.`, embeds: [embed] });
        let fakeMessage = { content: `/detectar`, guild: interaction.guild, author: interaction.user };
        interaction.client.emit('messageCreate', fakeMessage);
        setTimeout(() => {
          fakeMessage.content = `**/forceban**`;
          interaction.client.emit('messageCreate', fakeMessage);
        }, 2000);
        updateDataBase(interaction.client, interaction.guild, _guild, true);
      } catch (err) {
        await interaction.reply({ content: `Error: \`${err}\``, ephemeral: true });
      }
    } else {
      await interaction.reply({ content: 'Escribe la contraseña después de este mensaje. Si no la recuerdas o la perdiste, ve a mi servidor de soporte.' });
      const filter = m => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({ filter, time: 30000 });
      collector.on('collect', async m => {
        if (m.content) {
          if (_guild.protection.raidmode.password === m.content) {
            await interaction.followUp({ content: 'He desactivado el sistema, para activarlo vuelve a escribir el comando.' });
            _guild.protection.raidmode.enable = false;
            updateDataBase(interaction.client, interaction.guild, _guild, true);
          } else {
            await interaction.followUp({ content: 'Contraseña incorrecta, la contraseña ha cambiado y el tiempo para que el sistema se apague automáticamente ha sido ampliado durante 10 días.' });
            _guild.protection.raidmode.timeToDisable = ms(ms(_guild.protection.raidmode.timeToDisable) + ms('10d'));
            updateDataBase(interaction.client, interaction.guild, _guild, true);
          }
          collector.stop();
        }
      });
      collector.on('end', () => {
        interaction.channel.send({ content: 'Colector detenido.' });
      });
    }
    await _guild.save();
  }
};
