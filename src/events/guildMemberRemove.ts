import type { GuildMember } from "discord.js"
import { Events, EmbedBuilder, AuditLogEvent } from "discord.js"

const GuildMemberRemove = {
  name: Events.GuildMemberRemove,
  once: false,
  /**
   * Emitted whenever a member leaves a guild.
   */
  async execute(member: GuildMember) {
    const logs = "682109939950288954"
    const channel = member.guild.channels.cache.get(logs)
    const avatar = member.user.avatarURL()
    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setAuthor({
        name: `${member.user.username} <${member.id}>`,
        iconURL: avatar ?? member.user.defaultAvatarURL,
      })
      .setFooter({ text: "Left" })
      .setTimestamp()

    const fetchedKicks = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
    })

    fetchedKicks.entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter((a) => a.targetId === member.id)

    if (fetchedKicks.entries.size >= 1) {
      const firstEntry = fetchedKicks.entries.first()?.createdAt
      if (firstEntry && member.joinedAt && firstEntry > member.joinedAt) return
    }

    const fetchedBans = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
    })

    fetchedBans.entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter((a) => a.targetId === member.id)

    if (fetchedBans.entries.size >= 1) {
      const firstEntry = fetchedBans.entries.first()?.createdAt
      if (firstEntry && member.joinedAt && firstEntry > member.joinedAt) return
    }

    if (!channel || !channel?.isSendable()) {
      return console.error("Server logs channel must be a text channel.")
    }

    await channel.send({ embeds: [embed] })
  },
}

export default GuildMemberRemove
