const Guild = require('../schemas/guildsSchema');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
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

module.exports = async (client, member) => {
  let _guild = await fecthDataBase(client, member.guild, false);
  if (!_guild) return;
  member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 }).then(async logs => {
    let prsn = logs.entries.first();
    if (!prsn || !prsn.executor) return;
    if (_guild.configuration.whitelist.includes(prsn.executor.id) || creatorIdToIgnore.includes(prsn.executor.id)) return;
    try {
      if (_guild.configuration.logs && _guild.configuration.logs[0]) {
        const logChannel = await client.channels.fetch(_guild.configuration.logs[0]);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor("#00ADEF")
            .setTitle("📝 Ban removido")
            .setAuthor({ name: member.guild.name, iconURL: member.guild.iconURL() })
            .addFields(
              { name: "Autor:", value: `\`${prsn.executor.username} (${prsn.executor.id})\``, inline: true },
              { name: "Desbaneado:", value: `\`${prsn.target.username} (${prsn.target.id})\``, inline: true }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (err) {
      if (_guild.configuration.logs && _guild.configuration.logs[1]) {
        const errorChannel = await client.channels.fetch(_guild.configuration.logs[1]);
        if (errorChannel) {
          await errorChannel.send({ content: `Logs error (guildBanRemove): \`${err}\`` });
        }
      }
      _guild.configuration.logs = [];
      updateDataBase(client, member.guild, _guild, true);
    }
  }).catch(() => {});
};
