import { Events, Client, ActivityType, EmbedBuilder, ActionRow, ComponentType } from 'discord.js'
import mysql from 'mysql2/promise'
import { handleRunsCollector, handleChallengeCollector } from '../utilities/helper_functions.js'

const ready = {
	name: Events.ClientReady,
	once: true,
	/**
	 * Ready message when the bot connects to the Discord API.
	 *
	 * @param {Client} client The main hub for interacting with the Discord API, and the starting point for any bot.
	 */
	async execute(client) {
		const dbConnection = await mysql.createConnection({
			host: process.env.DB_SERVERNAME,
			user: process.env.DB_USERNAME,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DBNAME
		}).catch(async error => {
			console.log(error.stack)
			return { error: error }
		})
		
		if (dbConnection.error) return await interaction.reply(`Database connection error, contact <@${interaction.guild.ownerId}>`)
		
		client.user.setActivity('crossyoff.rf.gd', { type: ActivityType.Watching })
		
		const serverID = "600865413890310155"
		const guild = client.guilds.cache.get(serverID)
		
		// check uncached challenge requests
		const challengeLogsChannelID = "1171571198023442535"
		const challengeLogs = guild.channels.cache.get(challengeLogsChannelID)
		const challenges = await challengeLogs.messages.fetch({limit: 30})
		for (let message of challenges) {
			// reattatch message component listener for all pending challenges
			if (message[1].components.length > 0 &&
				message[1].components[0] instanceof ActionRow) {
				const sentEmbed = message[1]
				const [challengeQuery] = await dbConnection.execute('SELECT created, CONVERT(challenger_id, CHAR(18)) AS challenger_id, CONVERT(opponent_id, CHAR(18)) AS opponent_id  FROM `Crossy Road Challenges` WHERE `message_id` = ?', [sentEmbed.id])
				if (challengeQuery.length > 0) {
					const timestamp = challengeQuery[0].created
					const challengerID = challengeQuery[0].challenger_id
					const opponentID = challengeQuery[0].opponent_id
					const challenger = await guild.members.fetch(challengerID)
					// check if the run is expired
					if ((Date.now() - timestamp) > 3600000) {
						sentEmbed.embeds[0].data.author.icon_url = client.user.displayAvatarURL()
						sentEmbed.embeds[0].data.author.name = `${client.user.username} <${client.user.id}>`
						sentEmbed.embeds[0].data.color = 15548997
						sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
						sentEmbed.embeds[0].data.fields.push(
							{ name: 'Reason:', value: "opponent did not respond in time" }
						)
						
						await sentEmbed.edit({ content: `<@${challengerID}>`, embeds: [sentEmbed.embeds[0]], components: [] })
						// log into db to delete saved button collector
						await dbConnection.execute('DELETE FROM `Crossy Road Challenges` WHERE message_id = ?', [sentEmbed.id])
					} else {
						// reattatch listener for non-expired challenge
						const hour = 60 * 60 * 1000;
						const remainingTime = hour - (Date.now() - timestamp)
						const filter = (i) => i.user.id === opponentID
						const collector = sentEmbed.createMessageComponentCollector({
							componentType: ComponentType.Button,
							filter,
							time: remainingTime,
							max: 1
						})
						handleChallengeCollector(sentEmbed, challenger, collector)
					}
				} else {
					// delete non-existent challenges in database
					sentEmbed.embeds[0].data.author.icon_url = client.user.displayAvatarURL()
					sentEmbed.embeds[0].data.author.name = `${client.user.username} <${client.user.id}>`
					sentEmbed.embeds[0].data.color = 15548997
					sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
					sentEmbed.embeds[0].data.fields.push(
						{ name: 'Reason:', value: "Challenge does not exist in database." }
					)
					const challengerID = sentEmbed.embeds[0].data.author.name.match(/<(.*?)>/)[1]
					await sentEmbed.edit({ content: `<@${challengerID}>`, embeds: [sentEmbed.embeds[0]], components: [] })
				}
			}
		}
		
		
		// check uncached lcs runs
		const LcsRunsChannelID = "1211512804792598548"
		const logsChannelID = "682109939950288954"
		const lcsRunsChannel = guild.channels.cache.get(LcsRunsChannelID)
		const logsChannel = guild.channels.cache.get(logsChannelID)
		const lcsRunsMessages = await lcsRunsChannel.messages.fetch({ limit: 30 })
		// reattach button listners for all nonexpired runs
		for (let message of lcsRunsMessages) {
			if (message[1].components.length > 0 &&
				message[1].components[0] instanceof ActionRow) {
				// check if the run exists in the database
				let logEmbed
				const movesEmbed = message[1]
				const [runQuery] = await dbConnection.execute('SELECT * FROM `Crossy Road Runs` WHERE `message_id` = ?', [movesEmbed.id])
				if (runQuery.length > 0) {
					const timestamp = runQuery[0].created
					const actionsLeft = runQuery[0].actions
					const runAttempts = runQuery[0].run_attempts
					const userID = runQuery[0].user_id
					// check if the run is expired
					if ((Date.now() - timestamp) > 18000000 * 3) {
						logEmbed = await lcsRunsChannel.messages.fetch({ before: movesEmbed.id, limit: 1 })
						const name = logEmbed.first().embeds[0].data.author.name
						const iconURL = logEmbed.first().embeds[0].data.author.icon_url
						const id = logEmbed.first().id
						const embed = new EmbedBuilder()
							.setAuthor({
								name: name,
								iconURL: iconURL
							})
							.setColor("Red")
							.setFooter({ text: `Cancelled run ${id} due to expiration` })
							.setTimestamp()
						await movesEmbed.delete({ timeout: 1000 })
						await logsChannel.send({ embeds: [embed] })
					} else { // reattatch listener for non-expired run
						logEmbed = await lcsRunsChannel.messages.fetch({ before: movesEmbed.id, limit: 1 })
						const fifteenHours = 15 * 60 * 60 * 1000;
						const remainingTime = fifteenHours - (Date.now() - timestamp)
						const filter = (i) => i.user.id === userID
						const collector = movesEmbed.createMessageComponentCollector({
							componentType: ComponentType.Button,
							filter,
							time: remainingTime,
							max: actionsLeft
						})
						handleRunsCollector(logEmbed.first(), movesEmbed, collector, runAttempts)
					}
				} else { // delete non-existing runs in the database
					logEmbed = await lcsRunsChannel.messages.fetch({ before: movesEmbed.id, limit: 1 })
					const name = logEmbed.first().embeds[0].data.author.name
					const iconURL = logEmbed.first().embeds[0].data.author.icon_url
					const id = logEmbed.first().id
					const embed = new EmbedBuilder()
					.setAuthor({
						name: name,
						iconURL: iconURL
					})
					.setColor("Red")
					.setFooter({text: `Cancelled pending run ${id} due to run not existing in database.`})
					.setTimestamp()
					await movesEmbed.delete({timeout: 1000})
					await logsChannel.send({embeds: [embed]})
				}
			}
		}
		await dbConnection.end()
	}
}

export default ready
