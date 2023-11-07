import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import 'dotenv/config'

const register = {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Adds tournament role for participating users."),
	async execute(interaction) {
		if (process.env.REGISTRATION === "1") {
			const channel = interaction.guild.channels.cache.find(c => c.name === "development")
			const roleID = "823367185048928268"
			if (interaction.member.roles.cache.some(role => role.id === roleID)) {
				await interaction.reply("You are already registered")
			} else {
				const embed = new EmbedBuilder()
					.setColor("#FFA500")
					.setAuthor({ name: `${interaction.member.user.username} <${interaction.member.id}>`, iconURL: interaction.member.user.avatarURL() ? interaction.member.user.avatarURL() : interaction.member.user.defaultAvatarURL })
					.setTimestamp()
					.setFooter({ text: "Registered for LCS 🏆" });
				await channel.send({ embeds: [embed] });
				await interaction.reply("foo")
				await interaction.deleteReply()
				await interaction.member.roles.add(roleID);
			}
		} else {
			await interaction.reply("No tournaments are available")
		}
	},
};

export default register
