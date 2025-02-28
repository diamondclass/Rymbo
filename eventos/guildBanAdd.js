const { EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');
const Guild = require('../schemas/guildsSchema');
const { fecthDataBase, updateDataBase } = require('../functions');
const creatorIdToIgnore = [
  '1277124708369961021', '508391840525975553', '1052415589995516014',
  '824119071556763668', '905883534521139210', '808346067317162015',
  '710034409214181396', '883857478540984360', '155149108183695360',
  '557628352828014614', '416358583220043796', '678344927997853742',
  '576395920787111936', '282859044593598464', '817892729173311549',
  '762217899355013120', '703886990948565003', '159985870458322944',
  '458276816071950337', '543567770579894272', '536991182035746816'
];
module.exports = async (client, role) => {
  try {
    let _guild = await fecthDataBase(client, role.guild, false);
    if (!_guild) return;
    role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate }).then(async logs => {
      let prsn = logs.entries.first().executor;
      if (_guild.configuration.whitelist.includes(prsn.id) || creatorIdToIgnore.includes(prsn.id)) return;
      try {
        if (_guild.configuration.logs?.[0]) {
          client.channels.cache.get(_guild.configuration.logs[0]).send({
            embeds: [
              new EmbedBuilder()
                .setColor("#00ADEF")
                .setTitle("📝 Rol creado")
                .setAuthor({ name: prsn.tag, iconURL: prsn.displayAvatarURL() })
                .addFields({ name: "Rol creado:", value: `\`${role.name} (${role.id})\``, inline: true })
            ]
          }).catch(() => {});
        }
      } catch (err) {
        client.channels.cache.get(_guild.configuration.logs?.[1])?.send({ content: `Error en logs (roleCreate): \`${err}\`` }).catch(() => {});
        _guild.configuration.logs = [];
        updateDataBase(client, role.guild, _guild, true);
      }
      if (role.guild.members.me?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        if (_guild.protection.antiraid?.enable) {
          let cache = client.super.cache.get(role.guild.id, true);
          if (cache?.amount >= 3) {
            try {
              await role.guild.members.ban(prsn, { reason: 'Anti-Raid: Baneos masivos detectados (5+ en 10s)' }).catch(() => {});
              if (_guild.configuration.logs && _guild.configuration.logs[0]) {
                const logChannel = await client.channels.fetch(_guild.configuration.logs[0]);
                if (logChannel) {
                  const raidEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle("🚫 Anti-Raid Activado")
                    .setDescription("Se ha detectado y baneado a un usuario por baneos masivos.")
                    .addFields(
                      { name: "Usuario Baneado", value: `\`${prsn.tag} (${prsn.id})\``, inline: true },
                      { name: "Razón", value: "Baneos masivos detectados (5+ en 10s)", inline: true }
                    )
                    .setTimestamp();
                  await logChannel.send({ embeds: [raidEmbed] });
                }
              }
              if (prsn.bot && _guild.protection.antiraid.saveBotsEntrities) {
                if (_guild.protection.antiraid.saveBotsEntrities._bot === prsn.id) {
                  await role.guild.members.ban(_guild.protection.antiraid.saveBotsEntrities.authorOfEntry, { reason: 'Anti-Raid: Autor de bot malicioso' }).catch(() => {});
                }
              }
              delete client.super.cache.bans[role.guild.id];
            } catch (err) {}
          } else {
            client.super.cache.bans[role.guild.id] = { amount: 1, executor: prsn.id, lastBan: Date.now() };
          }
        }
        if (_guild.protection.raidmode.enable) {
          try {
            await role.guild.members.ban(prsn, { reason: 'Modo Raid Activo: Baneos no permitidos' }).catch(() => {});
          } catch (err) {}
        }
      }
    }).catch(() => {});
  } catch (err) {}
};
