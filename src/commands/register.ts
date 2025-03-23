import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import "dotenv/config"

const register = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Adds tournament role for participating users."),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) return
    if (process.env.REGISTRATION === "1") {
      const logs = interaction?.guild?.channels.cache.get("682109939950288954")
      const tournamentRoleID = process.env.TOURNAMENT_ROLE_ID
      const tournament = process.env.TOURNAMENT_NAME
      const username = interaction?.member?.user.username
      const userID = interaction.user.id
      const avatarURL = interaction.user.avatarURL()

      if (!tournamentRoleID) {
        return await interaction.reply(
          "The tournament role id is invalid. Contact <@254643053548142595>"
        )
      }

      if (
        interaction.inCachedGuild() &&
        interaction?.member?.roles.cache.has(tournamentRoleID)
      ) {
        await interaction.reply(`You are already registered for ${tournament}`)
      } else {
        const embed = new EmbedBuilder()
          .setColor("Orange")
          .setAuthor({
            name: `${username} <${userID}>`,
            iconURL: avatarURL ? avatarURL : interaction.user?.defaultAvatarURL,
          })
          .setTimestamp()
          .setFooter({ text: `Registered for ${tournament} 🏆` })
        if (logs?.isSendable()) await logs.send({ embeds: [embed] })
        await interaction.reply(`Successfully registered for ${tournament}`)
        await interaction?.member?.roles.add(tournamentRoleID)
      }
    } else {
      await interaction.reply("No tournaments are available")
    }
  },
}

export default register
