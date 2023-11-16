import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import 'dotenv/config'

const unregister = {
	data: new SlashCommandBuilder()
		.setName("unregister")
		.setDescription("Removes tournament role for participating users."),
	async execute(interaction) {
		if (process.env.REGISTRATION === "1") {
			const logs = interaction.guild.channels.cache.get("682109939950288954")
			const tournamentRoleID = process.env.TOURNAMENT_ROLE_ID
			const tournament = process.env.TOURNAMENT_NAME
			const username = interaction.member.user.username
			const userID = interaction.member.id
			const avatarURL = interaction.member.user.avatarURL() ? interaction.member.user.avatarURL() : interaction.member.user.defaultAvatarURL
			if (!interaction.member.roles.cache.has(tournamentRoleID)) {
				await interaction.reply(`You have not registered for ${tournament}`)
			} else {
				const embed = new EmbedBuilder()
					.setColor("DarkOrange")
					.setAuthor({ name: `${username} <${userID}>`, iconURL: avatarURL })
					.setTimestamp()
					.setFooter({ text: `Withdrew from ${tournament} 🏆` })
				await logs.send({ embeds: [embed] })
				await interaction.reply("foo")
				await interaction.deleteReply()
				await interaction.member.roles.remove(tournamentRoleID)
			}
		} else {
			await interaction.reply("No tournaments are available")
		}
	}
}

export default unregister
