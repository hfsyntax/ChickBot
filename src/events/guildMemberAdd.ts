import type { GuildMember } from "discord.js"
import { Events, EmbedBuilder } from "discord.js"
import limiter from "../utilities/limiter"

const GuildMemberAdd = {
  name: Events.GuildMemberAdd,
  once: false,
  /**
   * Emitted whenever a user joins a guild.
   *
   */
  async execute(member: GuildMember) {
    const logs = "682109939950288954"
    const channel = member.guild.channels.cache.get(logs)
    const avatar = member.user.avatarURL()
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setAuthor({
        name: `${member.user.username} <${member.id}>`,
        iconURL: avatar ?? member.user.defaultAvatarURL,
      })
      .setTimestamp()
      .setFooter({ text: "Joined" })
    if (!channel || !channel?.isSendable()) {
      return console.error("Server logs channel must be a text channel.")
    }
    await limiter.schedule(() => channel.send({ embeds: [embed] }))
  },
}

export default GuildMemberAdd
