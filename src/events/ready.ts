import type { ChallengeMessage, RunMessage } from "../types"
import type {
  Client,
  Message,
  MessageComponentInteraction,
  Collection,
} from "discord.js"
import {
  handleChallengeCollector,
  handleRunsCollector,
} from "../utilities/helper_functions"
import {
  Events,
  ActivityType,
  EmbedBuilder,
  ActionRow,
  ComponentType,
} from "discord.js"
import sql from "../sql"

const ready = {
  name: Events.ClientReady,
  once: true,
  /**
   * Ready message when the bot connects to the Discord API.
   *
   */
  async execute(client: Client) {
    client?.user?.setActivity("crossyoff.vercel.app", {
      type: ActivityType.Watching,
    })

    const serverID = "600865413890310155"
    const guild = client.guilds.cache.get(serverID)

    // check uncached challenge requests
    const challengeLogsChannelID = "1171571198023442535"
    const challengeLogs = guild?.channels.cache.get(challengeLogsChannelID)

    if (!challengeLogs?.isTextBased()) {
      throw new Error("Challenge log channel is not a text channel.")
    }

    const challenges = await challengeLogs?.messages.fetch({ limit: 30 })
    for (let message of challenges) {
      // reattatch message component listener for all pending challenges
      if (
        message[1].components.length > 0 &&
        message[1].components[0] instanceof ActionRow
      ) {
        const sentEmbed = message[1]
        const challengeEmbed = new EmbedBuilder(sentEmbed.embeds[0].data)
        const challengeQuery = await sql<Array<ChallengeMessage>>`
          SELECT created, challenger_id, opponent_id FROM crossy_road_challenges WHERE message_id = ${sentEmbed.id}`
        const challenge = challengeQuery[0]
        if (
          challengeQuery.length > 0 &&
          challenge.created &&
          challenge.challenger_id &&
          challenge.opponent_id
        ) {
          const timestamp = challenge.created
          const challengerID = challenge.challenger_id
          const opponentID = challenge.opponent_id
          const challenger = await guild?.members.fetch(challengerID)
          // check if the run is expired
          if (Date.now() - timestamp > 3600000) {
            challengeEmbed.setAuthor({
              iconURL: client.user?.displayAvatarURL(),
              name: `${client.user?.username} <${client.user?.id}>`,
            })
            challengeEmbed.setColor(15548997)
            challengeEmbed.setFooter({
              text: `Cancelled challenge ID: ${sentEmbed.id}`,
            })
            challengeEmbed.addFields({
              name: "Reason:",
              value: "opponent did not respond in time",
            })

            await sentEmbed.edit({
              content: `<@${challengerID}>`,
              embeds: [challengeEmbed],
              components: [],
            })

            // log into db to delete saved button collector
            await sql`DELETE FROM crossy_road_challenges WHERE message_id = ${sentEmbed.id}`
          } else {
            // reattatch listener for non-expired challenge
            const hour = 60 * 60 * 1000
            const remainingTime = hour - (Date.now() - timestamp)
            const filter = (i: MessageComponentInteraction) =>
              i.user.id === opponentID
            const collector = sentEmbed.createMessageComponentCollector({
              componentType: ComponentType.Button,
              filter,
              time: remainingTime,
              max: 1,
            })
            if (challenger)
              handleChallengeCollector(sentEmbed, challenger, collector)
          }
        } else {
          // delete non-existent challenges in database
          challengeEmbed.setAuthor({
            iconURL: client.user?.displayAvatarURL(),
            name: `${client.user?.username} <${client.user?.id}>`,
          })
          challengeEmbed.setColor(15548997)
          challengeEmbed.setFooter({
            text: `Cancelled challenge ID: ${sentEmbed.id}`,
          })
          challengeEmbed.addFields({
            name: "Reason:",
            value: "Challenge does not exist in database.",
          })
          const challengerID =
            sentEmbed.embeds[0].data.author?.name.match(/<(.*?)>/)?.[1]
          if (challengerID)
            await sentEmbed.edit({
              content: `<@${challengerID}>`,
              embeds: [challengeEmbed],
              components: [],
            })
        }
      }
    }

    // check uncached lcs runs
    const LcsRunsChannelID = "1211512804792598548"
    const logsChannelID = "682109939950288954"
    const lcsRunsChannel = guild?.channels.cache.get(LcsRunsChannelID)
    const logsChannel = guild?.channels.cache.get(logsChannelID)

    if (!lcsRunsChannel?.isTextBased()) {
      throw new Error("Lcs run logs channel is not a text channel.")
    }

    const lcsRunsMessages = await lcsRunsChannel.messages.fetch({ limit: 30 })
    // reattach button listners for all nonexpired runs
    for (let message of lcsRunsMessages) {
      if (
        message[1].components.length > 0 &&
        message[1].components[0] instanceof ActionRow
      ) {
        // check if the run exists in the database
        let logEmbedQuery: Collection<string, Message<true>>
        const movesEmbed = message[1]
        const runQuery = await sql<Array<RunMessage>>`
          SELECT created, actions, run_attempts, user_id FROM crossy_road_runs WHERE message_id = ${movesEmbed.id}`

        const run = runQuery[0]
        if (
          runQuery.length > 0 &&
          run.created &&
          run.actions &&
          run.user_id &&
          run.run_attempts
        ) {
          const timestamp = run.created
          const actionsLeft = run.actions
          const runAttempts = run.run_attempts
          const userID = run.user_id
          // check if the run is expired
          if (Date.now() - timestamp > 18000000 * 3) {
            logEmbedQuery = await lcsRunsChannel.messages.fetch({
              before: movesEmbed.id,
              limit: 1,
            })
            const logEmbed = logEmbedQuery.first()
            if (logEmbed) {
              const name = logEmbed.embeds[0].data.author?.name
              const iconURL = logEmbed.embeds[0].data.author?.icon_url
              const id = logEmbed?.id
              const embed = new EmbedBuilder()
                .setAuthor({
                  name: name ?? "uknown player",
                  iconURL: iconURL,
                })
                .setColor("Red")
                .setFooter({ text: `Cancelled run ${id} due to expiration` })
                .setTimestamp()
              await movesEmbed.delete()
              if (logsChannel?.isSendable())
                await logsChannel.send({ embeds: [embed] })
            }
          } else {
            // reattatch listener for non-expired run
            logEmbedQuery = await lcsRunsChannel.messages.fetch({
              before: movesEmbed.id,
              limit: 1,
            })
            const logEmbed = logEmbedQuery.first()
            const fifteenHours = 15 * 60 * 60 * 1000
            const remainingTime = fifteenHours - (Date.now() - timestamp)
            const filter = (i: MessageComponentInteraction) =>
              i.user.id === userID
            const collector = movesEmbed.createMessageComponentCollector({
              componentType: ComponentType.Button,
              filter,
              time: remainingTime,
              max: actionsLeft,
            })
            if (logEmbed)
              handleRunsCollector(logEmbed, movesEmbed, collector, runAttempts)
          }
        } else {
          // delete non-existing runs in the database
          logEmbedQuery = await lcsRunsChannel.messages.fetch({
            before: movesEmbed.id,
            limit: 1,
          })
          const logEmbed = logEmbedQuery.first()
          const name = logEmbed?.embeds[0].data.author?.name
          const iconURL = logEmbed?.embeds[0].data.author?.icon_url
          const id = logEmbed?.id
          const embed = new EmbedBuilder()
            .setAuthor({
              name: name ?? "uknown player",
              iconURL: iconURL,
            })
            .setColor("Red")
            .setFooter({
              text: `Cancelled pending run ${id} due to run not existing in database.`,
            })
            .setTimestamp()
          await movesEmbed.delete()
          if (logsChannel?.isSendable())
            await logsChannel.send({ embeds: [embed] })
        }
      }
    }
  },
}

export default ready
