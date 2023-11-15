import { Events, Client, ActivityType, EmbedBuilder } from 'discord.js'

const ready = {
	name: Events.ClientReady,
	once: true,
	/**
	 * Ready message when the bot connects to the Discord API.
	 *
	 * @param {Client} client The main hub for interacting with the Discord API, and the starting point for any bot.
	 */
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`)
		client.user.setActivity('crossyoff.rf.gd', { type: ActivityType.Watching })
		const serverID = "600865413890310155"
		const challengeLogsChannelID = "1171571198023442535"
		const guild = client.guilds.cache.get(serverID)
		const logsChannel = guild.channels.cache.get(challengeLogsChannelID)
		const messages = await logsChannel.messages.fetch({limit: 30})
		// delete unresolved pending challenges when bot restarts
		const challenges = messages.filter(m => 
			m.embeds.length === 1 &&
			m.reactions.cache.size > 0
		)
		if (challenges.size > 0) {
			challenges.forEach(async challenge => {
				const embed = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({
                    name: `${client.user.username} <${client.user.id}>`,
                    iconURL: client.user.avatarURL() ? client.user.avatarURL() : client.user.defaultAvatarURL
                })
                .setTimestamp()
				.setFooter({ text: `Cancelled pending challenge ID: ${challenge.id} due to bot restart` })
				await challenge.delete({timeout: 1000})
				await logsChannel.send({ embeds: [embed] })
			})
		}
	}
}

export default ready
