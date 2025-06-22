import type {
  ChatInputCommandInteraction,
  MessageComponentInteraction,
} from "discord.js"
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  TextChannel,
} from "discord.js"
import sql from "../sql.js"
import {
  generateMoves,
  handleRunsCollector,
  sendMessageToDeveloper,
} from "../utilities/helper_functions.js"
import limiter from "../utilities/limiter.js"
import chunkMessage from "../utilities/chunkMessage.js"

/**
 * Creates a run
 *
 * @param {ChatInputCommandInteraction} interaction
 */
async function createRun(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel?.isSendable()) return
  let runAttempts = 1
  const movesToDo = generateMoves()
  const avatar = interaction.user.avatarURL()
  const logEmbed = new EmbedBuilder()
    .setColor("Yellow")
    .setAuthor({
      name: `${interaction.user.username} <${interaction.user.id}>`,
      iconURL: avatar ? avatar : interaction.user.defaultAvatarURL,
    })
    .addFields({
      name: `Started Run ${runAttempts}`,
      value: `<t:${Math.floor(Date.now() / 1000)}> (${movesToDo})`,
    })
    .setTimestamp()
  await limiter.schedule(() => interaction.reply({ embeds: [logEmbed] }))
  const interactionMessage = await limiter.schedule(() =>
    interaction.fetchReply()
  )
  logEmbed.setFooter({ text: `Started runs ${interactionMessage.id}` })
  await limiter.schedule(() => interaction.editReply({ embeds: [logEmbed] }))
  // send a new embed which allows us to add a collector
  const movesEmbed = new EmbedBuilder()
    .setColor("Orange")
    .addFields({ name: "Moves to do before starting run:", value: movesToDo })
    .setFooter({ text: "Requested moves" })
    .setTimestamp()

  // create the buttons for the embed
  const nextRunButton = new ButtonBuilder()
    .setCustomId("nextrun")
    .setLabel("Next Run")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)

  const endRunButton = new ButtonBuilder()
    .setCustomId("endrun")
    .setLabel("End Run")
    .setStyle(ButtonStyle.Danger)

  const endRunsButton = new ButtonBuilder()
    .setCustomId("endruns")
    .setLabel("End All Runs")
    .setStyle(ButtonStyle.Danger)

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    nextRunButton,
    endRunButton,
    endRunsButton
  )

  const sentEmbed = await limiter
    .schedule(() => {
      if (!interaction.channel || !(interaction.channel instanceof TextChannel))
        throw new Error(
          "Failed to send moves embed in run command, interaction channel does not exist or is not a text channel."
        )
      return interaction.channel.send({
        embeds: [movesEmbed],
        components: [row],
      })
    })
    .catch(() => null)

  if (!sentEmbed)
    return console.error("Failed to send moves embed in createRun")

  const filter = (i: MessageComponentInteraction) =>
    i.user.id === interaction.user.id
  const collector = sentEmbed?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter,
    time: 18000000 * 3, // 5 hours per run, 3 runs total
    max: 5, // 5 actions total
  })

  // store run info to the database in case bots restarts

  const storeRunQuery =
    await sql`INSERT INTO crossy_road_runs (username, user_id, created, message_id, run_attempts, actions) VALUES (${interaction.user.username}, ${interaction.user.id}, ${sentEmbed.createdTimestamp}, ${sentEmbed.id}, ${runAttempts}, 5)`.catch(
      async (error: Error) => {
        await sendMessageToDeveloper(interaction, error.stack ?? String(error))
        console.error(error)
        return null
      }
    )
  if (!storeRunQuery) {
    return await limiter
      .schedule(() => {
        if (
          !interaction.channel ||
          !(interaction.channel instanceof TextChannel)
        )
          throw new Error(
            "Failed to send storeRunQuery message, interaction channel does not exist or is not a text channel."
          )
        return interaction.channel.send({
          content:
            "Failed to store run message. Contact: <@254643053548142595>",
        })
      })
      .catch(() => null)
  }
  // handle the button collector
  handleRunsCollector(interactionMessage, sentEmbed, collector, runAttempts)
}

const run = {
  data: new SlashCommandBuilder()
    .setName("run")
    .setDescription(
      "Generates a move sequence before starting a run in a challenge."
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return
    if (!interaction.channel?.isSendable()) return
    const challengeLobbyID = "1175955527688278016"
    // for challenges
    if (
      interaction.channel.name.includes("challenge") &&
      interaction.channel.id !== challengeLobbyID
    ) {
      const challengeID = interaction.channel.name.split("-")[1]
      const challengeLog = interaction?.guild.channels.cache.get(
        "1171571198023442535"
      )

      if (!challengeLog) {
        return await limiter.schedule(() =>
          interaction.reply(
            "Challenge log channel does not exist. Contact: <@254643053548142595>"
          )
        )
      }

      if (!challengeLog.isTextBased()) {
        return await limiter.schedule(() =>
          interaction.reply(
            "Challenge log channel is not a text channel. Contact: <@254643053548142595>"
          )
        )
      }

      const challengeEmbed = await limiter.schedule(() =>
        challengeLog.messages.fetch(challengeID)
      )
      const challengerID = challengeEmbed?.embeds?.[0]?.data?.author?.name
        .split("<")[1]
        .split(">")[0]
      const opponentID = challengeEmbed?.embeds?.[0]?.data?.description
        ?.split("<")[1]
        .split(">")[0]
      if (
        interaction.member.id === challengerID ||
        interaction.member.id === opponentID
      ) {
        createRun(interaction)
      } else {
        await limiter.schedule(() =>
          interaction.reply({
            content: "Only players can request runs.",
            flags: "Ephemeral",
          })
        )
      }
      // for lcs
    } else if (
      interaction.channel.name === "lcs-runs" ||
      interaction.channel.name === "development"
    ) {
      createRun(interaction)
    } else {
      await limiter.schedule(() =>
        interaction.reply({
          content:
            "You must be in a challenge or in #lcs-runs to use this command.",
          flags: "Ephemeral",
        })
      )
    }
  },
}

export default run
