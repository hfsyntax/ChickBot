import type {
  MessageReaction,
  User,
  MessageReactionEventDetails,
} from "discord.js"
import { Events } from "discord.js"
import {
  limiter,
  memberFetchLimiter,
  messageFetchLimiter,
  roleAddLimiter,
} from "../utilities/limiter"
const messageReactionAdd = {
  name: Events.MessageReactionAdd,
  once: false,
  /**
   * Emitted whenever a reaction is added.
   */
  async execute(
    messageReaction: MessageReaction,
    user: User,
    details: MessageReactionEventDetails
  ) {
    const reactionMessage = messageReaction.message.partial
      ? await messageFetchLimiter
          .key(messageReaction.message.channel.id)
          .schedule(() =>
            limiter.schedule(() => messageReaction.message.fetch())
          )
          .catch((error) => {
            console.error(error)
            return null
          })
      : messageReaction.message

    if (
      !reactionMessage?.guild ||
      reactionMessage.guild.id !== process.env.CRC_SERVER_ID ||
      reactionMessage.id !== "1436302473735307337" ||
      messageReaction.emoji.name !== "⭐"
    )
      return

    const roleId = "1436299759492272140"
    const member =
      reactionMessage.guild.members.cache.get(user.id) ??
      (await memberFetchLimiter
        .key(process.env.CRC_SERVER_ID)
        .schedule(() =>
          limiter.schedule(() => {
            if (!reactionMessage.guild) throw new Error("no guild")
            return reactionMessage.guild.members.fetch(user.id)
          })
        )
        .catch(() => null))

    if (!member) return

    const hasRole = member.roles.cache.has(roleId)

    if (hasRole) return

    await roleAddLimiter
      .key(member.guild.id)
      .schedule(() => limiter.schedule(() => member.roles.add(roleId)))
      .catch(() => null)
  },
}

export default messageReactionAdd
