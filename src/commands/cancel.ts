import type { ChatInputCommandInteraction } from "discord.js"
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRow,
  TextChannel,
} from "discord.js"
import sql from "../sql"
import limiter from "../utilities/limiter"
/**
 * Cancels a pending challenge.
 *
 */
const cancel = {
  data: new SlashCommandBuilder()
    .setName("cancel")
    .setDescription("Cancels a queue/challenge request.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for cancelling.")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (
      !interaction.inCachedGuild() ||
      !interaction.channel?.isTextBased() ||
      !interaction?.channel?.isSendable() ||
      interaction.channel.isThread()
    )
      return
    const challengeLog = interaction.guild.channels.cache.get(
      "1171571198023442535"
    )

    if (!challengeLog || !challengeLog.isTextBased()) {
      return interaction.reply({
        content:
          "Challenge log channel does not exist contact: <@254643053548142595>",
      })
    }

    const challengeLobbyID = "1175955527688278016"
    const playing = "1172359960559108116"
    const queued = "1172360108307644507"
    const referee = "799505175541710848"
    const reason = interaction.options.get("reason")
    const avatar = interaction.user?.avatarURL()
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: `${interaction.user.username} <${interaction.user.id}>`,
        iconURL: avatar ? avatar : interaction.user?.defaultAvatarURL,
      })
      .setTimestamp()
      .addFields({
        name: "Reason:",
        value: reason ? String(reason.value) : "no reason specified",
      })

    // created challenge channel and not challenge lobby
    if (
      interaction.channel.name.includes("challenge") &&
      interaction.channel.id !== challengeLobbyID
    ) {
      if (interaction.member.roles.cache.has(referee)) {
        const challengeID = interaction.channel.name.split("-")[1]
        const challengeEmbed = challengeLog.isTextBased()
          ? await limiter.schedule(() =>
              challengeLog.messages.fetch(challengeID)
            )
          : undefined

        if (!challengeEmbed) {
          return await limiter.schedule(() =>
            interaction.reply({
              content:
                "Cannot cancel the challenge since the challenge embed in #challenge-logs does not exist. Contact: <@254643053548142595>",
            })
          )
        }

        const challengerID = challengeEmbed.embeds?.[0].data.author?.name
          .split("<")[1]
          .split(">")[0]
        const opponentID = challengeEmbed?.embeds[0].data.description
          ?.split("<")[1]
          .split(">")[0]
        if (
          interaction.member.id === challengerID ||
          interaction.member.id === opponentID
        ) {
          await limiter.schedule(() =>
            interaction.reply({
              content: "You cannot cancel a challenge you are already playing.",
              flags: "Ephemeral",
            })
          )
        } else {
          const challenger = challengerID
            ? interaction.channel.members.get(challengerID)
            : undefined
          const opponent = opponentID
            ? interaction.channel.members.get(opponentID)
            : undefined
          // delete challenge record from server
          const deleteChallengeQuery =
            await sql`DELETE FROM crossy_road_challenges WHERE message_id = ${challengeID}`.catch(
              (error) => {
                console.error(error)
                return null
              }
            )

          if (!deleteChallengeQuery) {
            return await limiter.schedule(() =>
              interaction.reply({
                content: `Failed to delete challenge data. Contact: <@254643053548142595>`,
              })
            )
          }

          if (challenger) {
            limiter.schedule(() => challenger.roles.remove(playing))
          }
          if (opponent) {
            await limiter.schedule(() => opponent.roles.remove(playing))
          }
          embed.setFooter({
            text: `Referee cancelled challenge ID: ${challengeID}`,
          })

          await limiter.schedule(() => challengeLog.send({ embeds: [embed] }))
          await limiter.schedule(() =>
            interaction.reply({
              content: `Sucessfully cancelled challenge ID: ${challengeID}.`,
              flags: "Ephemeral",
            })
          )
          await limiter
            .schedule(() => {
              if (
                !interaction.channel ||
                !(interaction.channel instanceof TextChannel)
              )
                throw new Error(
                  "Cancel command used in a non-cached guild or non text-based channel."
                )
              return interaction.channel.delete()
            })
            .catch(() => null)
        }
      } else {
        await limiter.schedule(() =>
          interaction.reply({
            content: "You cannot cancel a challenge you are already playing.",
            flags: "Ephemeral",
          })
        )
      }
    } else {
      // cancelling from any channel
      if (interaction.member.roles.cache.has(playing)) {
        await limiter.schedule(() =>
          interaction.reply({
            content:
              "You cannot cancel a challenge when you are already playing.",
            flags: "Ephemeral",
          })
        )
      } else if (interaction.member.roles.cache.has(queued)) {
        await limiter.schedule(() => interaction.member.roles.remove(queued))
        await limiter.schedule(() =>
          interaction.reply({
            content:
              "You've been removed from the queue of players waiting for a challenge.",
            flags: "Ephemeral",
          })
        )
        embed.setFooter({ text: "Cancelled qeue for challenge" })
        await limiter.schedule(() => challengeLog.send({ embeds: [embed] }))
      } else {
        // cancel the first pending challenge
        const messages = await limiter.schedule(() =>
          challengeLog.messages.fetch({ limit: 30 })
        )
        const challenges = messages.filter(
          (m) =>
            m.embeds.length === 1 &&
            m?.embeds?.[0]?.data?.author?.name &&
            m.embeds[0].data.author.name.split("<")[1].split(">")[0] ===
              interaction.member.id &&
            m.components.length > 0 &&
            m.components[0] instanceof ActionRow
        )
        if (challenges.size > 0) {
          const challenge = challenges.first()
          // delete challenge id from database before logging to #challenge-logs
          if (challenge?.id) {
            const deleteChallengeQuery =
              await sql`DELETE FROM crossy_road_challenges WHERE message_id = ${challenge.id}`.catch(
                (error: Error) => {
                  console.error(error)
                  return null
                }
              )

            if (!deleteChallengeQuery) {
              return await limiter.schedule(() =>
                interaction.reply({
                  content: `Database connection error contact: <@254643053548142595>`,
                })
              )
            }

            embed.setFooter({ text: `Cancelled challenge ID: ${challenge.id}` })
          }
          await limiter
            .schedule(() => {
              if (!challenge) throw new Error("Challenge channel is undefined")
              return challenge.delete()
            })
            .catch(() => null)
          await limiter.schedule(() => challengeLog.send({ embeds: [embed] }))
          await limiter.schedule(() =>
            interaction.reply({
              content: "Sucessfully cancelled your challenge.",
              flags: "Ephemeral",
            })
          )
        } else {
          await limiter.schedule(() =>
            interaction.reply({
              content:
                "You have not created a challenge and you are not in a queue.",
              flags: "Ephemeral",
            })
          )
        }
      }
    }
  },
}

export default cancel
