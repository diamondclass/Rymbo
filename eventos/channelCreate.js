const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const { fecthDataBase, updateDataBase } = require('../functions');

const creatorIdToIgnore = [
  '1277124708369961021',
  '508391840525975553',
  '1052415589995516014',
  '824119071556763668',
  '883857478540984360',
  '155149108183695360',
  '905883534521139210',
  '808346067317162015',
  '710034409214181396',
  '557628352828014614',
  '416358583220043796',
  '678344927997853742',
  '576395920787111936',
  '282859044593598464',
  '817892729173311549',
  '762217899355013120',
  '703886990948565003',
  '159985870458322944',
  '458276816071950337',
  '543567770579894272',
  '536991182035746816'
];

const createdChannelsCache = new Map();
const RAID_THRESHOLD = 5;
const RAID_TIME_WINDOW = 10000;

module.exports = async (client, channel) => {
  try {
    const guildData = await fecthDataBase(client, channel.guild, false);
    if (!guildData) return;
    const auditLogs = await channel.guild.fetchAuditLogs({
      type: AuditLogEvent.ChannelCreate,
      limit: 1
    }).catch(console.error);
    if (auditLogs?.entries.size) {
      const logEntry = auditLogs.entries.first();
      const executor = logEntry.executor;
      if (executor) {
        if (guildData.configuration.logs?.[0]) {
          await sendImmediateLog(client, guildData, channel);
          await sendExecutorLog(client, guildData, channel, executor);
        }
        if (guildData.configuration.whitelist.includes(executor.id) || creatorIdToIgnore.includes(executor.id)) {
          return;
        }
        if (guildData.protection.antiraid?.enable) {
          const cache = await client.super.cache.get(channel.guild.id, true);
          if (cache.amount >= 3) {
            await handleRaidDetection(client, channel.guild, executor, guildData);
          } else {
            client.super.cache.up(channel.guild.id, cache);
            setTimeout(async () => {
              client.super.cache.delete(channel.guild.id);
            }, 10000);
          }
        }
        if (guildData.protection.antichannels?.enable) {
          if (!createdChannelsCache.has(executor.id)) {
            createdChannelsCache.set(executor.id, []);
          }
          const userCreatedChannels = createdChannelsCache.get(executor.id);
          userCreatedChannels.push({
            channelId: channel.id,
            timestamp: Date.now()
          });
          try {
            await channel.delete('Canal eliminado por sistema antichannel');
            await sendDeletionLog(client, guildData, channel, executor);
          } catch (error) {
            console.error('Error deleting channel:', error);
          }
          const recentCreations = userCreatedChannels.filter(creation => Date.now() - creation.timestamp < RAID_TIME_WINDOW);
          if (recentCreations.length >= RAID_THRESHOLD) {
            await handleRaid(client, channel.guild, executor, userCreatedChannels, guildData);
            createdChannelsCache.delete(executor.id);
          }
          createdChannelsCache.set(
            executor.id,
            userCreatedChannels.filter(creation => Date.now() - creation.timestamp < RAID_TIME_WINDOW)
          );
        }
        if (guildData.protection.raidmode?.enable && channel.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          await channel.guild.members.ban(executor, { reason: 'Raidmode.' }).catch(console.error);
        }
      }
    }
    await updateDataBase(client, channel.guild, guildData, true);
  } catch (error) {
    console.error('Error in channelCreate event:', error);
  }
};

async function handleRaidDetection(client, guild, executor, guildData) {
  try {
    await guild.members.ban(executor, { reason: 'Raid.' });
    if (executor.bot && guildData.protection.antiraid.saveBotsEntrities) {
      if (guildData.protection.antiraid.saveBotsEntrities._bot === executor.id) {
        await guild.members.ban(guildData.protection.antiraid.saveBotsEntrities.authorOfEntry).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error handling raid detection:', error);
  }
}

async function handleRaid(client, guild, executor, createdChannels, guildData) {
  try {
    if (guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await guild.members.ban(executor, {
        reason: `Raid Detectado - Creación de ${createdChannels.length} canales en ${RAID_TIME_WINDOW / 1000} segundos`
      });
      await sendBanLog(client, guild, executor, 'Raid Detectado - Creación masiva de canales');
    }
    for (const channelData of createdChannels) {
      const ch = guild.channels.cache.get(channelData.channelId);
      if (ch) {
        try {
          await ch.delete('Canal eliminado tras raid');
        } catch (error) {
          console.error('Error deleting raid channel:', error);
        }
      }
    }
    if (guildData.configuration.logs?.[0]) {
      try {
        const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor("#00FF00")
            .setTitle("🛡️ Recuperación de Raid Completada")
            .setDescription(`Se han eliminado ${createdChannels.length} canales creados durante el raid`)
            .addFields(
              { name: 'Usuario Baneado', value: `${executor.tag} (${executor.id})`, inline: true },
              { name: 'Tiempo de Detección', value: `${RAID_TIME_WINDOW / 1000} segundos`, inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error('Error sending raid recovery log:', error);
      }
    }
  } catch (error) {
    console.error('Error handling raid:', error);
  }
}

async function sendImmediateLog(client, guildData, channel) {
  if (!guildData.configuration.logs[0]) return;
  try {
    const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor("#00ADEF")
      .setTitle("📝 Canal Creado")
      .setDescription(`Se ha detectado la creación de un canal`)
      .addFields(
        { name: 'Nombre del Canal', value: channel.name || 'Desconocido', inline: true },
        { name: 'ID del Canal', value: channel.id || 'Desconocido', inline: true },
        { name: 'Tipo de Canal', value: String(channel.type) || 'Desconocido', inline: true }
      )
      .setTimestamp();
    if (channel.parent) {
      embed.addFields({ name: 'Categoría', value: channel.parent.name, inline: true });
    }
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending immediate log:', error);
  }
}

async function sendExecutorLog(client, guildData, channel, executor) {
  if (!guildData.configuration.logs[0]) return;
  try {
    const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor("#00ADEF")
      .setTitle("📝 Detalles de Canal Creado")
      .addFields(
        { name: 'Canal', value: `${channel.name} (${channel.id})`, inline: true },
        { name: 'Creado por', value: `${executor.tag} (${executor.id})`, inline: true }
      )
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending executor log:', error);
  }
}

async function sendDeletionLog(client, guildData, channel, executor) {
  if (!guildData.configuration.logs[0]) return;
  try {
    const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ Canal Eliminado por Protección")
      .addFields(
        { name: 'Canal', value: `${channel.name} (${channel.id})`, inline: true },
        { name: 'Creado por', value: `${executor.tag} (${executor.id})`, inline: true },
        { name: 'Razón', value: 'Sistema antichannel activado', inline: true }
      )
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending deletion log:', error);
  }
}

async function sendBanLog(client, guild, executor, reason) {
  try {
    const guildData = await fecthDataBase(client, guild, false);
    if (!guildData?.configuration.logs[0]) return;
    const logChannel = await client.channels.fetch(guildData.configuration.logs[0]);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🔨 Usuario Baneado")
      .addFields(
        { name: 'Usuario', value: `${executor.tag} (${executor.id})`, inline: true },
        { name: 'Razón', value: reason, inline: true }
      )
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending ban log:', error);
  }
}
