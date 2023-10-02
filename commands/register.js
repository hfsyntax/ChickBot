const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Adds tournament role for participating users."),
	async execute(interaction) {
		const channel = interaction.guild.channels.cache.find(c => c.name === "logs")
		const roleID = "823367185048928268"
		if (interaction.member.roles.cache.some(role => role.id === roleID)) {
			await interaction.reply("You are already registered!")
		} else {
			await interaction.reply("Registration has ended!")
		}
	},
};
