const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("unregister")
		.setDescription("Removes tournament role for participating users."),
	async execute(interaction) {
		const channel = interaction.guild.channels.cache.find(c => c.name === "logs")
		const roleID = "823367185048928268"
		if (!interaction.member.roles.cache.some(role => role.id === roleID)) {
			await interaction.reply("You have not registered!")
		} else {
			const embed = new EmbedBuilder()
			.setColor("#964B00")
			.setAuthor({ name: `${interaction.member.user.username} <${interaction.member.id}>`, iconURL: interaction.member.user.avatarURL() ? interaction.member.user.avatarURL() : interaction.member.user.defaultAvatarURL})
			.setTimestamp()
			.setFooter({ text: "Withdrew from LCS 🏆"});
			await channel.send({ embeds: [embed] });
			await interaction.reply("foo")
			await interaction.deleteReply()
			await interaction.member.roles.remove(roleID);
		}
	},
};
