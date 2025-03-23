import type { PlayerData } from "../types"
import type {
  ChatInputCommandInteraction,
  CommandInteractionOption,
  CacheType,
} from "discord.js"
import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import sql from "../sql"

const elo = {
  data: new SlashCommandBuilder()
    .setName("elo")
    .setDescription("Retrieves a CrossyOff elo.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to lookup.")
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel || !interaction.channel.isSendable()) return
    const user: CommandInteractionOption<CacheType> | null =
      interaction.options.get("user")
    const userId = user?.user?.id
    if (userId) {
      const userEloDataQuery = await sql<
        Array<PlayerData>
      >`SELECT elo, rank, games, won FROM crossy_road_elo_rankings where id = ${userId}`.catch(
        (error: Error) => {
          console.error(error)
          return null
        }
      )

      if (!userEloDataQuery) {
        return await interaction.reply({
          content: `Database connection error contact: <@254643053548142595>`,
        })
      }

      const userEloData = userEloDataQuery[0]

      if (
        userEloDataQuery.length > 0 &&
        userEloData.name &&
        userEloData.elo &&
        userEloData.rank &&
        userEloData.games &&
        userEloData.won
      ) {
        await interaction.reply(
          `Fetching elo for ${user?.user?.username} please be patient.`
        )

        const avatar = user.user?.avatarURL()
        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setAuthor({
            name: `${userEloData.name} <${userId}> (${userEloData.elo}) Rank: #${userEloData.rank} Played: ${userEloData.games} Won: ${userEloData.won}`,
            iconURL: avatar
              ? avatar !== null
                ? avatar
                : undefined
              : user.user?.defaultAvatarURL,
          })
          .setTimestamp()
          .setFooter({ text: `Retrieved from crossyoff.vercel.app` })
        return await interaction.channel.send({ embeds: [embed] })
      } else {
        return await interaction.reply({ content: "user not found" })
      }
    }
  },
}

export default elo
