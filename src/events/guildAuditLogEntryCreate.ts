import type { GuildAuditLogsEntry, Guild } from "discord.js"
import { AuditLogEvent, Events, EmbedBuilder } from "discord.js"

const GuildAuditLogEntryCreate = {
  name: Events.GuildAuditLogEntryCreate,
  once: false,
  /**
   * Emitted whenever a guild audit log entry is created.
   *
   */
  async execute(auditLog: GuildAuditLogsEntry, server: Guild) {
    const { action, executorId, targetId } = auditLog
    if (!executorId || !targetId) return
    const logs = "682109939950288954"
    if (
      action === AuditLogEvent.MemberKick ||
      action === AuditLogEvent.MemberBanAdd ||
      action === AuditLogEvent.MemberBanRemove
    ) {
      const executor = await server.members.fetch(executorId)
      const target = await server.members.client.users.fetch(targetId)
      const channel = server.channels.cache.get(logs)
      const executorAvatar = executor.user.avatarURL()
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${executor.user.username} <${executor.id}>`,
          iconURL: executorAvatar
            ? executorAvatar
            : executor.user.defaultAvatarURL,
        })
        .addFields(
          { name: "User:", value: `${target.username} <${target.id}>` },
          {
            name: "Reason:",
            value: auditLog.reason ? auditLog.reason : "no reason specified",
          }
        )
        .setTimestamp()

      if (!channel || !channel.isSendable()) {
        return console.error("Server logs channel must be a text channel.")
      }

      if (action === AuditLogEvent.MemberKick) {
        embed.setFooter({ text: "Kicked" })
        embed.setColor("Yellow")
      } else if (action === AuditLogEvent.MemberBanAdd) {
        embed.setFooter({ text: "Banned" })
        embed.setColor("Red")
      } else if (action === AuditLogEvent.MemberBanRemove) {
        embed.setFooter({ text: "Unbanned" })
        embed.setColor("Blue")
      }

      await channel.send({ embeds: [embed] })
    }
  },
}

export default GuildAuditLogEntryCreate
