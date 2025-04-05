import type { Player, PlayerData } from "../types.js"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import sql from "../sql.js"
import { calculateElo } from "../utilities/calculateElo.js"

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
          return await interaction.reply({
            content:
              "Challenge log does not exist. Contact <@254643053548142595>",
          })
        }

        if (!challengeLog.isTextBased()) {
          return await interaction.reply({
            content:
              "Challenge log is not a text channel. Contact <@254643053548142595>",
          })
        }

        if (
          !player1ID ||
          !players.has(player1ID) ||
          !player2ID ||
          !players.has(player2ID)
        ) {
          return await interaction.reply({
            content: "Supplied players must be in the same channel.",
            flags: "Ephemeral",
          })
        } else if (player1ID === player2ID) {
          return await interaction.reply({
            content: "Player 1 cannot be the same as player 2.",
            flags: "Ephemeral",
          })
        } else if (players.has(interaction.user.id)) {
          return await interaction.reply({
            content: "You cannot judge your own challenge.",
            flags: "Ephemeral",
          })
        } else if (score1 < 0 || score2 < 0) {
          return await interaction.reply({
            content: "neither score can be negative.",
            flags: "Ephemeral",
          })
        } else {
          const challengeID = interaction.channel.name.split("-")[1]
          await interaction.reply({
            content: `Attempting to judge challenge ID: ${challengeID}`,
          })

          //insert new players and assign crossyoff role
          const player1Query =
            await sql`SELECT id FROM crossy_road_elo_rankings WHERE id = ${player1ID}`.catch(
              (error: Error) => {
                console.error(error)
                return null
              }
            )

          if (!player1Query) {
            return await interaction.channel.send({
              content: `Failed to check player elo data. Contact: <@254643053548142595>`,
            })
          }

          const player2Query = await sql`
            SELECT id FROM crossy_road_elo_rankings WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!player2Query) {
            return await interaction.channel.send({
              content: `Failed to check opponent elo data. Contact: <@254643053548142595>`,
            })
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
              return await interaction.channel.send({
                content: `Failed to insert new player into database. Contact: <@254643053548142595>`,
              })
            }
            await player1.member?.roles.add(crossyoff)
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
              return await interaction.channel.send({
                content: `Failed to insert new player into database. Contact: <@254643053548142595>`,
              })
            }

            await player2?.member?.roles.add(crossyoff)
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
            return await interaction.channel.send({
              content: `Failed to get existing player from database. Contact: <@254643053548142595>`,
            })
          }

          const player2DataQuery = await sql<Array<PlayerData>>`
            SELECT name, elo, games, won FROM crossy_road_elo_rankings WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!player2DataQuery) {
            return await interaction.channel.send({
              content: `Failed to get existing player from database. Contact: <@254643053548142595>`,
            })
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
            return await interaction.channel.send({
              content: `Failed to get some existing player data fields. Contact: <@254643053548142595>`,
            })
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
            return await interaction.channel.send({
              content: `Failed to update players elo rankings. Contact: <@254643053548142595>`,
            })
          }

          const updatePlayer2DataQuery = await sql`
            UPDATE crossy_road_elo_rankings SET elo = ${player2Data.elo}, games = ${player2Data.games}, won = ${player2Data.won} WHERE id = ${player2ID}`.catch(
            (error: Error) => {
              console.error(error)
              return null
            }
          )

          if (!updatePlayer2DataQuery) {
            return await interaction.channel.send({
              content: `Failed to update players elo rankings. Contact: <@254643053548142595>`,
            })
          }

          //convert player1/player2 params to challenger/opponent
          const challengeMessage = await challengeLog?.messages?.fetch(
            challengeID
          )
          const challengerID =
            challengeMessage?.embeds?.[0]?.data?.author?.name?.match(
              /<(.*?)>/
            )?.[1]

          if (!challengerID) {
            return await interaction.channel.send({
              content: `Could not parse challenger from challenge embed contact: <@254643053548142595>`,
            })
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
            return await interaction.channel.send({
              content: `Failed to update existing challenge data. Contact: <@254643053548142595>`,
            })
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
            return await interaction.channel.send({
              content: `Failed to update all CrossyOff players elo rankings. Contact: <@254643053548142595>`,
            })
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
          await challengeMessage.edit({
            embeds: [challengeEmbedBuilder],
            components: [],
          })
          await player1?.member?.roles.remove(playing)
          await player2?.member?.roles.remove(playing)
          await interaction.channel.delete()
        }
      } else {
        await interaction.reply({
          content:
            "You must be in a created challenge channel to use this command.",
          flags: "Ephemeral",
        })
      }
    } else {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        flags: "Ephemeral",
      })
    }
  },
}

export default judge
