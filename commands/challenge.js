import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, PermissionFlagsBits, CommandInteraction, GuildMember, TextChannel, ButtonStyle, ActionRowBuilder, ActionRow, ComponentType } from 'discord.js'
import mysql from 'mysql2/promise'
import { config } from 'dotenv'
import { handleChallengeCollector, startChallenge } from '../utilities/helper_functions.js'

/**
 * Creates a match request for a challenger and opponent.
 *
 * @param {CommandInteraction} interaction The interaction sent from the slash command.
 * @param {GuildMember|CommandInteraction} opponent The user who was challenged.
 * @param {TextChannel} challengeLog The channel to log events in.
 * @param {string} playing The id for the playing role.
 * @param {string} queued The id for the queued role.
 * @param {boolean} queuedMatch Whether the challenge was queued.
 * @returns {Promise<boolean>} whether the challenge is successfully created.
 * @throws {Error} If there is an error associated with mysql2 or if there is a Discord API error.
 */
async function createMatchRequest(interaction, opponent, challengeLog, playing, queued, queuedMatch) {
	config({ path: '../.env' })

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

	opponent = opponent.member ? opponent.member : opponent
	const [challengerData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [interaction.user.id])
	const [opponentData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [opponent.user.id])
	const challengerName = challengerData.length > 0 ? challengerData[0].name : interaction.user.username
	const challengerElo = challengerData.length > 0 ? challengerData[0].elo : 1200
	const challengerGames = challengerData.length > 0 ? challengerData[0].games : 0
	const challengerID = interaction.user.id
	const challengerAvatar = interaction.user.avatarURL()
	const challengerDefaultAvatar = interaction.user.defaultAvatarURL
	const opponentName = opponentData.length > 0 ? opponentData[0].name : opponent.user.username
	const opponentElo = opponentData.length > 0 ? opponentData[0].elo : 1200
	const opponentGames = opponentData.length > 0 ? opponentData[0].games : 0
	const opponentID = opponent.user.id
	let sentEmbed

	const embed = new EmbedBuilder()
		.setColor("Yellow")
		.setAuthor({
			name: `${interaction.user.username} <${challengerID}>`,
			iconURL: challengerAvatar ? challengerAvatar : challengerDefaultAvatar
		})
		.addFields(
			{ name: "Challenger", value: challengerName, inline: true },
			{ name: "Elo", value: `${challengerElo}`, inline: true },
			{ name: "Played", value: `${challengerGames}`, inline: true },
			{ name: "Opponent", value: opponentName, inline: true },
			{ name: "Elo", value: `${opponentElo}`, inline: true },
			{ name: "Played", value: `${opponentGames}`, inline: true }
		)
		.setTimestamp()

	if (!queuedMatch) {
		sentEmbed = await challengeLog.send({ content: `<@${opponentID}>`, embeds: [embed] })

		// create the buttons for the embed
		const acceptButton = new ButtonBuilder()
			.setCustomId('accept')
			.setLabel('Accept')
			.setStyle(ButtonStyle.Success)

		const rejectButton = new ButtonBuilder()
			.setCustomId('reject')
			.setLabel('Reject')
			.setStyle(ButtonStyle.Danger)

		const row = new ActionRowBuilder()
			.addComponents(acceptButton, rejectButton);

		const filter = (i) => i.user.id === opponentID
		const collector = sentEmbed.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter,
			time: 3600000, // 1 hour to respond
			max: 1
		})

		embed.setFooter({ text: `challenge ID: ${sentEmbed.id}` })
		await sentEmbed.edit({ embeds: [embed], components: [row] })

		// store challege collector data in case bot restarts
		const fields = "created, message_id, challenger_id, opponent_id, winner_id, challenger_initial_elo, challenger_final_elo, challenger_score, opponent_initial_elo, opponent_final_elo, opponent_score"
		await dbConnection.execute(`INSERT INTO \`Crossy Road Challenges\` (${fields}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [sentEmbed.createdTimestamp, sentEmbed.id, challengerID, opponentID, 0, challengerElo, challengerElo, 0, opponentElo, opponentElo, 0])
		// for non-queued match, call startChallenge in collector if button accepted
		handleChallengeCollector(sentEmbed, interaction.member, collector)
	} else { // queued match call startChallenge immediately...
		sentEmbed = await challengeLog.send({ content: `<@${opponentID}>`, embeds: [embed] })
		await startChallenge(sentEmbed, opponent, interaction)
	}
	await dbConnection.end()
}

const challenge = {
	data: new SlashCommandBuilder()
		.setName("challenge")
		.setDescription("Play against a random user or add @user to challenge a user.")
		.addUserOption(option =>
			option.setName('opponent')
				.setDescription('The user to challenge.')),
	async execute(interaction) {
		const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")
		let opponent = interaction.options.get("opponent")
		const playing = "1172359960559108116"
		const queued = "1172360108307644507"
		const challengeLobbyID = "1175955527688278016"
		if (interaction.channel.id === challengeLobbyID || interaction.channel.name === "development") {
			if (interaction.member.roles.cache.has(playing) || interaction.member.roles.cache.has(queued)) {
				await interaction.reply("You are already queued/playing a challenge.")
			} else if (opponent) {
				if (opponent.user.id === interaction.user.id) {
					await interaction.reply("You cannot challenge yourself.")
				} else if (opponent.member.roles.cache.has(playing) || opponent.member.roles.cache.has(queued)) {
					await interaction.reply(`${opponent.user.username} is already in a queue/challenge.`)
				} else if (opponent.user.bot) {
					await interaction.reply("You cannot challenge a bot")
				} else {
					await interaction.reply(`Attempting to create a challenge request in <#${challengeLog.id}>.`)
					await createMatchRequest(interaction, opponent, challengeLog, playing, queued, false)
				}
			} else {
				// ensure the player has no pending challenges before adding to queue
				const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")
				const messages = await challengeLog.messages.fetch({ limit: 30 })
				const challenges = messages.filter(m =>
					m.embeds.length === 1 &&
					m.embeds[0].data.author.name &&
					m.embeds[0].data.author.name.split('<')[1].split('>')[0]
					=== interaction.member.id &&
					m.components.length > 0 &&
					m.components[0] instanceof ActionRow
				)
				if (challenges.size > 0) {
					await interaction.reply("Cancel your challenge request before joining the queue.")
				} else {
					const waiting = interaction.guild.roles.cache.get(queued)
					if (waiting.members.size < 1) {
						
							await interaction.reply("You've been added to the queue of players waiting for a challenge.")
							await interaction.member.roles.add(queued)
							const embed = new EmbedBuilder()
								.setColor("Grey")
								.setAuthor({
									name: `${interaction.user.username} <${interaction.user.id}>`,
									iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
								})
								.setFooter({ text: "Qeued for challenge" })
								.setTimestamp()
							await challengeLog.send({ embeds: [embed] })
						
						
					} else {
						opponent = waiting.members.first()
						await interaction.reply(`You've been matched against ${opponent.user.username} see: <#${challengeLog.id}>.`)
						await opponent.roles.remove(queued)
						await createMatchRequest(interaction, opponent, challengeLog, playing, queued, true)
					}
				}
			}
		} else {
			await interaction.reply(`You must be in <#${challengeLobbyID}> to use this command.`)
		}

	}
}

export default challenge
