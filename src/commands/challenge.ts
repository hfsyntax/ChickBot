import type { PlayerData } from "../types.js"
import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  GuildMember,
  TextChannel,
  MessageComponentInteraction,
  Message,
} from "discord.js"
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ActionRow,
  ComponentType,
} from "discord.js"
import sql from "../sql.js"
import {
  handleChallengeCollector,
  startChallenge,
} from "../utilities/helper_functions.js"
import { error } from "console"

/**
 * Creates a match request for a challenger and opponent.
 *
 */
async function createMatchRequest(
  interaction: CommandInteraction,
  opponent: GuildMember,
  challengeLog: TextChannel,
  playing: string,
  queued: string,
  queuedMatch: boolean
) {
  if (!interaction.inCachedGuild()) return

  const challengerDataQuery = await sql<
    Array<PlayerData>
  >`SELECT name, elo, games FROM crossy_road_elo_rankings WHERE id = ${interaction.user.id}`.catch(
    (error: Error) => {
      console.error(error)
      return null
    }
  )

  if (!challengerDataQuery) {
    if (interaction.channel?.isSendable())
      await interaction?.channel?.send({
        content: `Failed to check challenger challenge data. Contact: <@254643053548142595>`,
      })
    return
  }

  const opponentDataQuery = await sql<
    Array<PlayerData>
  >`SELECT name, elo, games, won FROM crossy_road_elo_rankings WHERE id = ${opponent.user.id}`.catch(
    (error) => {
      console.error(error)
      return null
    }
  )

  if (!opponentDataQuery) {
    if (interaction.channel?.isSendable())
      await interaction?.channel?.send({
        content: `Failed to check opponent challenge data. Contact: <@254643053548142595>`,
      })
    return
  }

  const challengerData = challengerDataQuery[0]
  const opponentData = opponentDataQuery[0]

  const challengerName =
    challengerDataQuery.length > 0 && challengerData.name
      ? challengerData.name
      : interaction.user.username
  const challengerElo =
    challengerDataQuery.length > 0 && challengerData.elo
      ? challengerData.elo
      : 1200
  const challengerGames =
    challengerDataQuery.length > 0 && challengerData.games
      ? challengerData.games
      : 0
  const challengerID = interaction.user.id
  const challengerAvatar = interaction.user.avatarURL()
  const challengerDefaultAvatar = interaction.user.defaultAvatarURL
  const opponentName =
    opponentDataQuery.length > 0 && opponentData.name
      ? opponentData.name
      : opponent.user.username
  const opponentElo =
    opponentDataQuery.length > 0 && opponentData.elo ? opponentData.elo : 1200
  const opponentGames =
    opponentDataQuery.length > 0 && opponentData.games ? opponentData.games : 0
  const opponentID = opponent.user.id
  let sentEmbed: Message

  const embed = new EmbedBuilder()
    .setColor("Yellow")
    .setAuthor({
      name: `${interaction.user.username} <${challengerID}>`,
      iconURL: challengerAvatar ? challengerAvatar : challengerDefaultAvatar,
    })
    .addFields(
      { name: "Challenger", value: challengerName, inline: true },
      { name: "Elo", value: `${challengerElo}`, inline: true },
      { name: "Played", value: `${challengerGames}`, inline: true },
      { name: "Opponent", value: opponentName, inline: true },
      { name: "Elo", value: `${opponentElo}`, inline: true },
      { name: "Played", value: `${opponentGames}`, inline: true }
    )
    .setTimestamp()

  if (!queuedMatch) {
    sentEmbed = await challengeLog.send({
      content: `<@${opponentID}>`,
      embeds: [embed],
    })

    // create the buttons for the embed
    const acceptButton = new ButtonBuilder()
      .setCustomId("accept")
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success)

    const rejectButton = new ButtonBuilder()
      .setCustomId("reject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      acceptButton,
      rejectButton
    )

    const filter = (i: MessageComponentInteraction) => i.user.id === opponentID
    const collector = sentEmbed.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter,
      time: 3600000, // 1 hour to respond
      max: 1,
    })

    embed.setFooter({ text: `challenge ID: ${sentEmbed.id}` })
    await sentEmbed.edit({ embeds: [embed], components: [row] })

    // store challege collector data in case bot restarts
    const storeChallengeCollectorQuery =
      await sql`INSERT INTO crossy_road_challenges 
    (created, message_id, challenger_id, opponent_id, winner_id, challenger_initial_elo, challenger_final_elo, challenger_score, opponent_initial_elo, opponent_final_elo, opponent_score) 
    VALUES (${sentEmbed.createdTimestamp}, ${sentEmbed.id}, ${challengerID}, ${opponentID}, 0, ${challengerElo}, 0, 0, ${opponentElo}, ${opponentElo}, 0)`.catch(
        (error: Error) => {
          console.error(error)
          return null
        }
      )

    if (!storeChallengeCollectorQuery) {
      if (interaction.channel?.isSendable())
        await interaction?.channel?.send({
          content: `Failed to store challenge message. Contact: <@254643053548142595>`,
        })
      return
    }

    // for non-queued match, call startChallenge in collector if button accepted
    handleChallengeCollector(sentEmbed, interaction.member, collector)
  } else {
    // queued match call startChallenge immediately...
    sentEmbed = await challengeLog.send({
      content: `<@${opponentID}>`,
      embeds: [embed],
    })
    await startChallenge(sentEmbed, opponent, interaction)
  }
}

const challenge = {
  data: new SlashCommandBuilder()
    .setName("challenge")
    .setDescription(
      "Play against a random user or add @user to challenge a user."
    )
    .addUserOption((option) =>
      option.setName("opponent").setDescription("The user to challenge.")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return
    const challengeLog = interaction?.guild?.channels.cache.get(
      "1171571198023442535"
    ) as TextChannel | undefined

    if (!challengeLog) {
      return await interaction.reply(
        "The challenge log channel does not exist. Contact: @<254643053548142595>"
      )
    }

    let opponent = interaction.options.get("opponent")?.member
    const playing = "1172359960559108116"
    const queued = "1172360108307644507"
    const challengeLobbyID = "1175955527688278016"
    if (
      interaction.inCachedGuild() &&
      (interaction?.channel?.id === challengeLobbyID ||
        interaction?.channel?.name === "development")
    ) {
      if (
        interaction.member.roles.cache.has(playing) ||
        interaction.member.roles.cache.has(queued)
      ) {
        return await interaction.reply(
          "You are already queued/playing a challenge."
        )
      } else if (opponent) {
        if (opponent?.user?.id === interaction.user.id) {
          return await interaction.reply("You cannot challenge yourself.")
        } else if (
          opponent.roles.cache.has(playing) ||
          opponent.roles.cache.has(queued)
        ) {
          return await interaction.reply(
            `${opponent.user.username} is already in a queue/challenge.`
          )
        } else if (opponent.user.bot) {
          return await interaction.reply("You cannot challenge a bot")
        } else {
          await interaction.reply(
            `Attempting to create a challenge request in <#${challengeLog.id}>.`
          )
          return await createMatchRequest(
            interaction,
            opponent,
            challengeLog,
            playing,
            queued,
            false
          )
        }
      } else {
        // ensure the player has no pending challenges before adding to queue
        const messages = await challengeLog.messages.fetch({ limit: 30 })
        const challenges = messages.filter(
          (m) =>
            m.embeds.length === 1 &&
            m.embeds?.[0]?.data?.author?.name &&
            m.embeds[0].data.author.name.split("<")[1].split(">")[0] ===
              interaction.member.id &&
            m.components.length > 0 &&
            m.components[0] instanceof ActionRow
        )
        if (challenges.size > 0) {
          return await interaction.reply(
            "Cancel your challenge request before joining the queue."
          )
        } else {
          const waiting = interaction.guild.roles.cache.get(queued)
          if (waiting?.members && waiting.members.size < 1) {
            await interaction.reply(
              "You've been added to the queue of players waiting for a challenge."
            )
            await interaction.member.roles.add(queued)
            const avatar = interaction.user?.avatarURL()
            const embed = new EmbedBuilder()
              .setColor("Grey")
              .setAuthor({
                name: `${interaction.user.username} <${interaction.user.id}>`,
                iconURL: avatar ? avatar : interaction.user?.defaultAvatarURL,
              })
              .setFooter({ text: "Qeued for challenge" })
              .setTimestamp()
            return await challengeLog.send({ embeds: [embed] })
          } else {
            const queuedPlayer = waiting?.members.first()
            if (!queuedPlayer) {
              return await interaction.reply(
                "Error getting player from queue. Contact <@254643053548142595>"
              )
            }
            opponent = queuedPlayer
            await interaction.reply(
              `You've been matched against ${opponent.user.username} see: <#${challengeLog.id}>.`
            )
            await opponent.roles.remove(queued)
            await createMatchRequest(
              interaction,
              opponent,
              challengeLog,
              playing,
              queued,
              true
            )
          }
        }
      }
    } else {
      return await interaction.reply(
        `You must be in <#${challengeLobbyID}> to use this command.`
      )
    }
  },
}

export default challenge
