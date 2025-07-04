import type {
  CommandInteraction,
  Message,
  GuildMember,
  ReadonlyCollection,
  InteractionCollector,
  ButtonInteraction,
  MessageActionRowComponentBuilder,
  ChatInputCommandInteraction,
} from "discord.js"
import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ComponentType,
  TextChannel,
} from "discord.js"
import sql from "../sql"
import limiter from "./limiter"
import chunkMessage from "./chunkMessage"

async function sendMessageToDeveloper(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  message: string
) {
  const dev = await limiter
    .schedule(() => {
      if (!interaction.guild) throw new Error("Guild does not exist")
      return interaction.guild.members.fetch("254643053548142595")
    })
    .catch(() => null)

  if (dev) {
    await Promise.all(
      chunkMessage(message).map((m) =>
        limiter.schedule(() => dev.send({ content: m }))
      )
    )
  }
}

/**
 * Generates a 4 move sequence to be performed before a run.
 */
function generateMoves() {
  const possibleMoves = ["LEFT", "RIGHT"]

  const movesArray = Array.from(
    { length: 4 },
    () => possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
  )

  const movesTodo = movesArray.join(" ")

  return movesTodo
}

/**
 * Handles when the user interacts a run message button component
 *
 */
function handleRunsCollector(
  logEmbed: Message,
  movesEmbed: Message,
  collector:
    | InteractionCollector<ButtonInteraction>
    | InteractionCollector<ButtonInteraction<"cached">>,
  runAttempts: number
) {
  const logEmbedBuilder = new EmbedBuilder(logEmbed.embeds[0].data)
  const movesEmbedBuilder = new EmbedBuilder(movesEmbed.embeds[0].data)

  collector.on("collect", async (interactor: ButtonInteraction) => {
    if (!interactor.channel?.isSendable()) return
    // only send interaction reply once
    if (!interactor.replied || interactor.deferred) {
      await limiter.schedule(() => interactor.reply({ content: "foobar" }))
      await limiter.schedule(() => interactor.deleteReply())
    }

    const cachedActionRow = interactor.message.components[0]
    // actionRowBuilder for buttons
    const component = cachedActionRow.data
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>(
      component
    )
    const nextRunButton =
      cachedActionRow.components[0].type === ComponentType.Button
        ? new ButtonBuilder(cachedActionRow.components[0].data)
        : undefined
    const endRunButton =
      cachedActionRow.components[1].type === ComponentType.Button
        ? new ButtonBuilder(cachedActionRow.components[1].data)
        : undefined

    const endRunsButton =
      cachedActionRow.components[2].type === ComponentType.Button
        ? new ButtonBuilder(cachedActionRow.components[2].data)
        : undefined
    if (nextRunButton && endRunButton && endRunsButton)
      row.addComponents([nextRunButton, endRunButton, endRunsButton])

    if (interactor.customId === "endruns") {
      logEmbedBuilder.addFields({
        name: `Ended all Runs`,
        value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
        inline: false,
      })
      const deleteRunMessageQuery =
        await sql`DELETE FROM crossy_road_runs WHERE message_id = ${movesEmbed.id}`.catch(
          async (error: Error) => {
            await sendMessageToDeveloper(
              interactor,
              error.stack ?? String(error)
            )
            console.error(error)
            return null
          }
        )

      if (!deleteRunMessageQuery) {
        return await limiter
          .schedule(() => {
            if (
              !interactor.inCachedGuild() ||
              !(interactor.channel instanceof TextChannel)
            )
              throw new Error(
                "Runs collector used in a non-cached guild or non text-based channel."
              )
            return interactor.channel.send({
              content:
                "Failed to delete run message in database. Contact <@254643053548142595>",
            })
          })
          .catch(() => null)
      }

      await limiter.schedule(() => logEmbed.edit({ embeds: [logEmbedBuilder] }))
      await limiter.schedule(() => movesEmbed.delete())
    } else if (interactor.customId === "nextrun") {
      // set new moves and update timestamp to the moves embed for each run
      const movesToDo = generateMoves()
      movesEmbedBuilder.spliceFields(0, 1, {
        name: "Moves to do before starting run:",
        value: movesToDo,
        inline: false,
      })
      movesEmbedBuilder.setTimestamp()
      // enable end run button again
      nextRunButton?.setDisabled(true)
      endRunButton?.setDisabled(false)
      await limiter.schedule(() =>
        movesEmbed.edit({
          embeds: [movesEmbedBuilder],
          components: [row],
        })
      )
      // add the time started for each run to the interaction embed
      logEmbedBuilder.addFields({
        name: `Started Run ${runAttempts}`,
        value: `<t:${Math.floor(Date.now() / 1000)}> (${movesToDo})`,
        inline: false,
      })
      await limiter.schedule(() => logEmbed.edit({ embeds: [logEmbedBuilder] }))
      const updateRunMessageQuery =
        await sql`UPDATE crossy_road_runs SET actions = actions - 1 WHERE message_id = ${movesEmbed.id}`.catch(
          async (error: Error) => {
            await sendMessageToDeveloper(
              interactor,
              error.stack ?? String(error)
            )
            console.error(error)
            return null
          }
        )
      if (!updateRunMessageQuery) {
        return await limiter
          .schedule(() => {
            if (
              !interactor.inCachedGuild() ||
              !(interactor.channel instanceof TextChannel)
            )
              throw new Error(
                "Runs collector used in a non-cached guild or non text-based channel."
              )
            return interactor.channel.send({
              content: `Failed to update run message in database. Contact <@254643053548142595>`,
            })
          })
          .catch(() => null)
      }
    } else if (interactor.customId === "endrun") {
      // enable next run button again
      nextRunButton?.setDisabled(false)
      endRunButton?.setDisabled(true)
      await limiter.schedule(() =>
        movesEmbed.edit({
          embeds: [movesEmbedBuilder],
          components: [row],
        })
      )
      logEmbedBuilder.addFields({
        name: `Ended Run ${runAttempts}`,
        value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
        inline: false,
      })

      if (runAttempts === 3) {
        logEmbedBuilder.addFields({
          name: `Ended all Runs`,
          value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
          inline: false,
        })

        const deleteRunMessageQuery =
          await sql`DELETE FROM crossy_road_runs WHERE message_id = ${movesEmbed.id}`.catch(
            async (error: Error) => {
              await sendMessageToDeveloper(
                interactor,
                error.stack ?? String(error)
              )
              console.error(error)
              return null
            }
          )

        if (!deleteRunMessageQuery) {
          return await limiter
            .schedule(() => {
              if (
                !interactor.inCachedGuild() ||
                !(interactor.channel instanceof TextChannel)
              )
                throw new Error(
                  "Runs collector used in a non-cached guild or non text-based channel."
                )
              return interactor.channel.send({
                content:
                  "Failed to delete run message in database. Contact <@254643053548142595>",
              })
            })
            .catch(() => null)
        }

        await limiter.schedule(() => movesEmbed.delete())
      } else {
        runAttempts++
        const updateRunMessageQuery =
          await sql`UPDATE crossy_road_runs SET run_attempts = ${runAttempts}, actions = actions - 1  WHERE message_id = ${movesEmbed.id}`.catch(
            async (error: Error) => {
              await sendMessageToDeveloper(
                interactor,
                error.stack ?? String(error)
              )
              console.error(error)
              return null
            }
          )
        if (!updateRunMessageQuery) {
          return await limiter
            .schedule(() => {
              if (
                !interactor.inCachedGuild() ||
                !(interactor.channel instanceof TextChannel)
              )
                throw new Error(
                  "Runs collector used in a non-cached guild or non text-based channel."
                )
              return interactor.channel.send({
                content:
                  "Failed to update run message in database. Contact <@254643053548142595>",
              })
            })
            .catch(() => null)
        }
      }
      await limiter.schedule(() => logEmbed.edit({ embeds: [logEmbedBuilder] }))
    }
  })

  collector.on(
    "end",
    async (collected: ReadonlyCollection<string, any>, reason: string) => {
      console.log(`collector has ended due to reason: ${reason}`)
    }
  )
}

/**
 * Handles when the user interacts with a challenge message button component
 *
 * @param {Message} sentEmbed - the embed sent containing the challenge
 * @param {GuildMember} challenger - the member who created the challenge
 * @param {InteractionCollector} collector the discord.js message component collector
 */
function handleChallengeCollector(
  sentEmbed: Message,
  challenger: GuildMember,
  collector:
    | InteractionCollector<ButtonInteraction>
    | InteractionCollector<ButtonInteraction<"cached">>
) {
  const challengeEmbedBuilder = new EmbedBuilder(sentEmbed.embeds[0].data)

  collector.on("collect", async (interactor: ButtonInteraction) => {
    if (!interactor.inCachedGuild() || !interactor.channel) return
    const playing = "1172359960559108116"

    // only send interaction reply once
    if (!interactor.replied || interactor.deferred) {
      await limiter.schedule(() =>
        interactor.reply({ content: "foobar", flags: "Ephemeral" })
      )
      await limiter.schedule(() => interactor.deleteReply())
    }

    // if the challenger is already playing
    if (challenger.roles.cache.has(playing)) {
      challengeEmbedBuilder.setColor(15548997)
      challengeEmbedBuilder.setFooter({
        text: `Cancelled challenge ID: ${sentEmbed.id}`,
      })
      challengeEmbedBuilder.addFields({
        name: "Reason:",
        value: "Challenger is already playing",
      })

      await limiter.schedule(() =>
        sentEmbed.edit({
          content: `<@${interactor.user.id}>`,
          embeds: [challengeEmbedBuilder],
          components: [],
        })
      )
    }
    // if the person challenged is already playing
    else if (interactor.member.roles.cache.has(playing)) {
      challengeEmbedBuilder.setColor(15548997)
      challengeEmbedBuilder.setFooter({
        text: `Cancelled challenge ID: ${sentEmbed.id}`,
      })
      challengeEmbedBuilder.addFields({
        name: "Reason:",
        value: "Opponent is already playing",
      })
      await limiter.schedule(() =>
        sentEmbed.edit({
          content: `<@${challenger.id}>`,
          embeds: [challengeEmbedBuilder],
          components: [],
        })
      )
    } else if (interactor.customId === "accept") {
      await startChallenge(sentEmbed, challenger, interactor)
    } else if (interactor.customId === "reject") {
      challengeEmbedBuilder.setColor(15548997)
      challengeEmbedBuilder.setFooter({
        text: `Cancelled challenge ID: ${sentEmbed.id}`,
      })
      challengeEmbedBuilder.addFields({
        name: "Reason:",
        value: "Opponent rejected challenge",
      })
      await limiter.schedule(() =>
        sentEmbed.edit({
          content: `<@${challenger.id}>`,
          embeds: [challengeEmbedBuilder],
          components: [],
        })
      )
      const deleteChallengeMessageQuery =
        await sql`DELETE FROM crossy_road_challenges WHERE message_id = ${sentEmbed.id}`.catch(
          (error: Error) => {
            console.error(error)
            return null
          }
        )

      if (!deleteChallengeMessageQuery) {
        return await limiter
          .schedule(() => {
            if (
              !interactor.inCachedGuild() ||
              !(interactor.channel instanceof TextChannel)
            )
              throw new Error(
                "Runs collector used in a non-cached guild or non text-based channel."
              )
            return interactor.channel.send({
              content:
                "Failed to delete challenge message in database. Contact <@254643053548142595>",
            })
          })
          .catch(() => null)
      }
    }
  })

  collector.on("end", async (collected, reason) => {
    console.log(`collector stopped due to reason: ${reason}`)
    if (reason === "time") {
      challengeEmbedBuilder.setColor(15548997)
      challengeEmbedBuilder.setFooter({
        text: `Cancelled challenge ID: ${sentEmbed.id}`,
      })
      challengeEmbedBuilder.addFields({
        name: "Reason:",
        value: "opponent did not respond in time",
      })
      await limiter.schedule(() =>
        sentEmbed.edit({
          content: `<@${challenger.id}>`,
          embeds: [challengeEmbedBuilder],
          components: [],
        })
      )
      // delete saved button collector reference
      const deleteChallengeMessageQuery =
        await sql`DELETE FROM crossy_road_challenges WHERE message_id = ${sentEmbed.id}`

      if (!deleteChallengeMessageQuery && sentEmbed.channel.isSendable()) {
        return await limiter
          .schedule(() => {
            if (!(sentEmbed.channel instanceof TextChannel))
              throw new Error(
                "Runs collector used in a non-cached guild or non text-based channel."
              )
            return sentEmbed.channel.send({
              content:
                "Failed to delete challenge message in database. Contact <@254643053548142595>",
            })
          })
          .catch(() => null)
      }
    }
  })
}

/**
 * Starts a challenge once its accepted
 *
 */
async function startChallenge(
  sentEmbed: Message,
  challenger: GuildMember,
  interaction: CommandInteraction | ButtonInteraction
) {
  if (!interaction.inCachedGuild()) return
  const challengeEmbedBuilder = new EmbedBuilder(sentEmbed.embeds[0].data)
  challengeEmbedBuilder.setTimestamp()
  challengeEmbedBuilder.setFooter({
    text: `Started challenge ID: ${sentEmbed.id}`,
  })
  await limiter.schedule(() =>
    sentEmbed.edit({
      content: "",
      embeds: [challengeEmbedBuilder],
      components: [],
    })
  )
  const everyone = "600865413890310155"
  const refs = "799505175541710848"
  const queued = "1172360108307644507"
  const playing = "1172359960559108116"
  //create channel for match
  const createdChannel = await limiter
    .schedule(() =>
      interaction?.guild?.channels.create({
        name: `Challenge-${sentEmbed.id}`,
        type: ChannelType.GuildText,
        parent: "1171570995056881704",
        permissionOverwrites: [
          {
            id: everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: refs,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: challenger.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      })
    )
    .catch((error) => {
      console.error(error)
      return null
    })

  if (!createdChannel)
    return console.error("Error creating challenge channel in startChallenge.")

  // if the match is queued we remove both users queue roles
  if (interaction.member.roles.cache.has(queued)) {
    await limiter.schedule(() => interaction.member.roles.remove(queued))
  }

  if (challenger.roles.cache.has(queued)) {
    await limiter.schedule(() => challenger.roles.remove(queued))
  }

  await limiter.schedule(() => interaction.member.roles.add(playing))
  await limiter.schedule(() => challenger.roles.add(playing))

  const rulesEmbed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("CrossyOff Challenge Rules")
    .setDescription("Rules: <https://crossyoff.rf.gd/rules/challenges.php>")
    .setFooter({
      text: `challenge ID: ${sentEmbed.id} When finished ping @Referee`,
    })
    .setTimestamp()
    .addFields({
      name: "Important Rule Highlights",
      value:
        "- all runs must be recorded and have a savable link\n- do not open Crossy Road until after the recording has started\n- use `/run` before starting your runs",
    })

  await limiter.schedule(() =>
    createdChannel.send({
      content: `<@${interaction.user.id}> <@${challenger.id}>`,
      embeds: [rulesEmbed],
    })
  )
}

export {
  sendMessageToDeveloper,
  generateMoves,
  handleRunsCollector,
  handleChallengeCollector,
  startChallenge,
}
