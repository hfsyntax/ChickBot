import type { Player, PlayerData } from "../types.js"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder, EmbedBuilder, TextChannel } from "discord.js"
import sql from "../sql.js"
import { calculateElo } from "../utilities/calculateElo.js"
import limiter from "../utilities/limiter.js"

const judge = {
  data: new SlashCommandBuilder()
    .setName("judge")
    .setDescription("Judges a finished challenge.")
    .addUserOption((option) =>
      option
        .setName("player1")
        .setDescription("The first player.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("score1")
        .setDescription("The first score.")
        .setRequired(true)
        .setMinValue(0)
    )
    .addUserOption((option) =>
      option
        .setName("player2")
        .setDescription("The second player.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("score2")
        .setDescription("The second score.")
        .setRequired(true)
        .setMinValue(0)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel) return
    const referee = "799505175541710848"
    const playing = "1172359960559108116"
    const crossyoff = "1130623021313429504"
    const challengeLobbyID = "1175955527688278016"
    if (
      interaction.inCachedGuild() &&
      interaction.member.roles.cache.has(referee)
    ) {
      if (
        interaction.channel.name.includes("challenge") &&
        interaction.channel.id !== challengeLobbyID &&
        interaction.channel.isTextBased() &&
        !interaction.channel.isThread()
      ) {
        const player1 = interaction.options.get("player1")
        const player1ID = player1?.user?.id
        const score1 = interaction.options.get("score1")?.value as number

        const player2 = interaction.options.get("player2")
        const player2ID = player2?.user?.id
        const score2 = interaction.options.get("score2")?.value as number

        const players = interaction.channel.members.filter(
          (m) => !m.user.bot && m.roles.cache.has(playing)
        )
        const challengeLog = interaction.guild.channels.cache.get(
          "1171571198023442535"
        )

        if (!challengeLog) {
          return await limiter.schedule(() =>
            interaction.reply({
              content:
                "Challenge log does not exist. Contact <@254643053548142595>",
            })
          )
        }

        if (!challengeLog.isTextBased()) {
          return await limiter.schedule(() =>
            interaction.reply({
              content:
                "Challenge log is not a text channel. Contact <@254643053548142595>",
            })
          )
        }

        if (
          !player1ID ||
          !players.has(player1ID) ||
          !player2ID ||
          !players.has(player2ID)
        ) {
          return await limiter.schedule(() =>
            interaction.reply({
              content: "Supplied players must be in the same channel.",
              flags: "Ephemeral",
            })
          )
        } else if (player1ID === player2ID) {
          return await limiter.schedule(() =>
            interaction.reply({
              content: "Player 1 cannot be the same as player 2.",
              flags: "Ephemeral",
            })
          )
        } else if (players.has(interaction.user.id)) {
          return await limiter.schedule(() =>
            interaction.reply({
              content: "You cannot judge your own challenge.",
              flags: "Ephemeral",
            })
          )
        } else if (score1 < 0 || score2 < 0) {
          return await limiter.schedule(() =>
            interaction.reply({
              content: "neither score can be negative.",
              flags: "Ephemeral",
            })
          )
        } else {
          const challengeID = interaction.channel.name.split("-")[1]
          await limiter.schedule(() =>
            interaction.reply({
              content: `Attempting to judge challenge ID: ${challengeID}`,
            })
          )

          //insert new players and assign crossyoff role
          const player1Query =
            await sql`SELECT id FROM crossy_road_elo_rankings WHERE id = ${player1ID}`.catch(
              (error: Error) => {
                console.error(error)
                return null
              }
            )

          if (!player1Query) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send player1query error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to check player elo data. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const player2Query = await sql`
            SELECT id FROM crossy_road_elo_rankings WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!player2Query) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Judge command failed to send error message, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to check opponent elo data. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          if (player1Query.length === 0 && player1.user?.username) {
            const player1InsertionQuery = await sql`
              INSERT INTO crossy_road_elo_rankings (name, id) VALUES (${player1.user.username}, ${player1ID})`.catch(
              (error: Error) => {
                console.error(error)
                return null
              }
            )

            if (!player1InsertionQuery) {
              return await limiter
                .schedule(() => {
                  if (
                    !interaction.channel ||
                    !(interaction.channel instanceof TextChannel)
                  )
                    throw new Error(
                      "Failed to send error message for judge command, interaction channel does not exist or is not a text channel."
                    )
                  return interaction.channel.send({
                    content: `Failed to insert new player into database. Contact: <@254643053548142595>`,
                  })
                })
                .catch(() => null)
            }
            await limiter
              .schedule(() => {
                if (!player1.member)
                  throw new Error(
                    "Could not resolve player1 to add CrossyOff role in judge command."
                  )
                return player1.member?.roles.add(crossyoff)
              })
              .catch(() => null)
          }
          if (player2Query.length === 0 && player2.user?.username) {
            const player2InsertionQuery = await sql`
              INSERT INTO crossy_road_elo_rankings (name, id) VALUES (${player2.user.username}, ${player2ID})`.catch(
              (error: Error) => {
                console.error(error)
                return null
              }
            )

            if (!player2InsertionQuery) {
              return await limiter
                .schedule(() => {
                  if (
                    !interaction.channel ||
                    !(interaction.channel instanceof TextChannel)
                  )
                    throw new Error(
                      "Failed to resolve player2 in judge command, interaction channel does not exist or is not a text channel."
                    )
                  return interaction.channel.send({
                    content: `Failed to insert new player into database. Contact: <@254643053548142595>`,
                  })
                })
                .catch(() => null)
            }

            await limiter
              .schedule(() => {
                if (!player2.member)
                  throw new Error(
                    "Failed to resolve player2 to add CrossyOff role to player2 in Judge command."
                  )
                return player2.member.roles.add(crossyoff)
              })
              .catch(() => null)
          }

          //fetch each players data based on id
          const player1DataQuery = await sql<Array<PlayerData>>`
            SELECT name, elo, games, won FROM crossy_road_elo_rankings WHERE id = ${player1ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!player1DataQuery) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send player1DataQuery error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to get existing player from database. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const player2DataQuery = await sql<Array<PlayerData>>`
            SELECT name, elo, games, won FROM crossy_road_elo_rankings WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!player2DataQuery) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send player2DataQuery error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to get existing player from database. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const player1Data = player1DataQuery[0]

          const player2Data = player2DataQuery[0]

          if (
            !player1Data.name ||
            !player1Data.elo ||
            !player1Data.games ||
            !player1Data.won ||
            !player2Data.name ||
            !player2Data.elo ||
            !player2Data.games ||
            !player2Data.won
          ) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send data fields error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to get some existing player data fields. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const initalPlayer1Elo = player1Data.elo
          const initalPlayer2Elo = player2Data.elo

          const player1EloStats: Player = {
            elo: player1Data.elo,
            games: player1Data.games,
            won: player1Data.won,
          }

          const player2EloStats: Player = {
            elo: player2Data.elo,
            games: player2Data.games,
            won: player2Data.won,
          }

          let winnerID = "0" // in case there's a tie
          //calculate elo based on score
          if (score1 > score2) {
            calculateElo(player1EloStats, player2EloStats, 1)
            winnerID = player1ID
          } else if (score1 < score2) {
            calculateElo(player1EloStats, player2EloStats, 0)
            winnerID = player2ID
          } else {
            calculateElo(player1EloStats, player2EloStats, 0.5)
          }

          //update rows in crossy road elo rankings
          const updatePlayer1DataQuery = await sql`
            UPDATE crossy_road_elo_rankings SET elo = ${player1Data.elo}, games = ${player1Data.games}, won = ${player1Data.won} WHERE id = ${player1ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!updatePlayer1DataQuery) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send updatePlayer1DataQuery error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to update players elo rankings. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const updatePlayer2DataQuery = await sql`
            UPDATE crossy_road_elo_rankings SET elo = ${player2Data.elo}, games = ${player2Data.games}, won = ${player2Data.won} WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!updatePlayer2DataQuery) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send updatePlayer2DataQuery error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to update players elo rankings. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          //convert player1/player2 params to challenger/opponent
          const challengeMessage = await limiter.schedule(() =>
            challengeLog?.messages?.fetch(challengeID)
          )
          const challengerID =
            challengeMessage?.embeds?.[0]?.data?.author?.name?.match(
              /<(.*?)>/
            )?.[1]

          if (!challengerID) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to get challenger id and send error message in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Could not parse challenger from challenge embed contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          const challenerName =
            challengerID === player1ID ? player1Data.name : player2Data.name
          const challengerPlayed =
            challengerID === player1ID ? player1Data.games : player2Data.games
          const challengerInitalElo =
            challengerID === player1ID ? initalPlayer1Elo : initalPlayer2Elo
          const challengerFinalElo =
            challengerID === player1ID ? player1Data.elo : player2Data.elo
          const challengerScore = challengerID === player1ID ? score1 : score2
          const challengerResult =
            winnerID === "0"
              ? "Tie"
              : winnerID === challengerID
              ? "Won"
              : "Lost"
          const opponentID = challengerID !== player1ID ? player1ID : player2ID
          const opponentName =
            challengerID !== player1ID ? player1Data.name : player2Data.name
          const opponentPlayed =
            challengerID !== player1ID ? player1Data.games : player2Data.games
          const opponentInitalElo =
            challengerID !== player1ID ? initalPlayer1Elo : initalPlayer2Elo
          const opponentFinalElo =
            challengerID !== player1ID ? player1Data.elo : player2Data.elo
          const opponentScore = challengerID !== player1ID ? score1 : score2
          const opponentResult =
            winnerID === "0" ? "Tie" : winnerID === opponentID ? "Won" : "Lost"

          //update row in crossy road challenges
          const updateChallengeData = await sql`
            UPDATE crossy_road_challenges SET winner_id = ${winnerID}, challenger_final_elo = ${challengerFinalElo}, challenger_score = ${challengerScore}, opponent_final_elo = ${opponentFinalElo}, opponent_score = ${opponentScore} WHERE message_id = ${challengeID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!updateChallengeData) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send update challenge data error message, channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to update existing challenge data. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          //update all player ranks
          const updateEloRankings = await sql`
          WITH ranked_players AS (
            SELECT id, elo, RANK() OVER (ORDER BY elo DESC) AS rank
            FROM crossy_road_elo_rankings
          )
          UPDATE crossy_road_elo_rankings p
          SET rank = rp.rank
          FROM ranked_players rp
          WHERE p.id = rp.id;`.catch((error: Error) => {
            console.error(error)
            return null
          })

          if (!updateEloRankings) {
            return await limiter
              .schedule(() => {
                if (
                  !interaction.channel ||
                  !(interaction.channel instanceof TextChannel)
                )
                  throw new Error(
                    "Failed to send updateelorankings query error in judge, interaction channel does not exist or is not a text channel."
                  )
                return interaction.channel.send({
                  content: `Failed to update all CrossyOff players elo rankings. Contact: <@254643053548142595>`,
                })
              })
              .catch(() => null)
          }

          //update log to challenge-logs with data changes
          const challengeEmbedBuilder = new EmbedBuilder(
            challengeMessage.embeds[0].data
          )
          challengeEmbedBuilder.setColor(12745742)
          challengeEmbedBuilder.setAuthor({
            name: `${interaction.user.username} <${interaction.user.id}>`,
            iconURL: interaction.user.displayAvatarURL(),
          })

          challengeEmbedBuilder.addFields(
            {
              name: `Challenger (${challengerResult})`,
              value: `${challenerName} (${challengerScore})`,
              inline: true,
            },
            {
              name: "Elo",
              value: `${challengerInitalElo}-${challengerFinalElo}`,
              inline: true,
            },
            {
              name: "Played",
              value: `${challengerPlayed}`,
              inline: true,
            },
            {
              name: `Opponent (${opponentResult})`,
              value: `${opponentName} (${opponentScore})`,
              inline: true,
            },
            {
              name: "Elo",
              value: `${opponentInitalElo}-${opponentFinalElo}`,
              inline: true,
            },
            {
              name: "Played",
              value: `${opponentPlayed}`,
              inline: true,
            }
          )

          challengeEmbedBuilder.setFooter({
            text: `Finished challenge ID: ${challengeID}`,
          })
          await limiter.schedule(() =>
            challengeMessage.edit({
              embeds: [challengeEmbedBuilder],
              components: [],
            })
          )
          await limiter
            .schedule(() => {
              if (!player1.member)
                throw new Error(
                  "Failed to resolve player1 to remove playing role"
                )
              return player1.member.roles.remove(playing)
            })
            .catch(() => null)
          await limiter
            .schedule(() => {
              if (!player2.member)
                throw new Error(
                  "Failed to resolve player2 to remove playing role"
                )
              return player2?.member?.roles.remove(playing)
            })
            .catch(() => null)
          await limiter
            .schedule(() => {
              if (!(interaction.channel instanceof TextChannel))
                throw new Error(
                  "failed to delete challenge channel in judge since it does not exist or is not a text channel"
                )
              return interaction.channel.delete()
            })
            .catch(() => null)
        }
      } else {
        await limiter.schedule(() =>
          interaction.reply({
            content:
              "You must be in a created challenge channel to use this command.",
            flags: "Ephemeral",
          })
        )
      }
    } else {
      await limiter.schedule(() =>
        interaction.reply({
          content: "You do not have permission to use this command.",
          flags: "Ephemeral",
        })
      )
    }
  },
}

export default judge
