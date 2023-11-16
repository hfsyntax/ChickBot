import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, CommandInteraction, GuildMember, TextChannel } from 'discord.js'
import mysql from 'mysql2/promise'

/**
 * Creates a match request for a challenger and opponent.
 *
 * @param {CommandInteraction} interaction The interaction sent from the slash command.
 * @param {GuildMember|CommandInteraction} opponent The user who was challenged.
 * @param {TextChannel} logs The channel to log events in.
 * @param {string} playing The id for the playing role.
 * @param {string} queued The id for the queued role.
 * @param {boolean} queuedMatch Whether the challenge was queued.
 * @returns {Promise<boolean>} whether the challenge is successfully created.
 * @throws {Error} If there is an error associated with mysql2 or if there is a Discord API error.
 */
async function createMatchRequest(interaction, opponent, logs, playing, queued, queuedMatch) {
	
	const dbConnection = await mysql.createConnection({
		host: process.env.DB_SERVERNAME,
		user: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DBNAME
	}).catch(async error => {
		await dbConnection.end()
		console.log(error.stack)
		return {error: error}
	})

	if (dbConnection.error) return false
	
	opponent = opponent.member ? opponent.member : opponent
	const [challengerData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [interaction.user.id])
	const [opponentData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [opponent.user.id])
	const challengerName = challengerData.length > 0 ? challengerData[0].name : interaction.user.username
	const challengerElo = challengerData.length > 0 ? challengerData[0].elo : 1200
	const challengerGames = challengerData.length > 0 ? challengerData[0].games : 0 
	const challengerWon = challengerData.length > 0 ? challengerData[0].won : 0 
	const challengerID = interaction.user.id
	const challengerAvatar = interaction.user.avatarURL()
	const challengerDefaultAvatar = interaction.user.defaultAvatarURL
	const opponentName = opponentData.length > 0 ? opponentData[0].name : opponent.user.username
	const opponentElo = opponentData.length > 0 ? opponentData[0].elo : 1200
	const opponentGames = opponentData.length > 0 ? opponentData[0].games : 0
	const opponentWon = opponentData.length > 0 ? opponentData[0].won : 0 
	const opponentID = 	opponent.user.id
	const everyone = "600865413890310155"
	const refs = "799505175541710848"
	const crossyoff = "1130623021313429504"
	let sentEmbed
	let reactionCollector
	let reaction
	let createdChannel
	let rulesEmbed 

	const embed = new EmbedBuilder()
		.setColor("Yellow")
		.setAuthor({
			name: `${challengerName} <${challengerID}> (${challengerElo}) Played: ${challengerGames} Won: ${challengerWon}`,
			iconURL: challengerAvatar ? challengerAvatar : challengerDefaultAvatar
		})
		.setDescription(`Challenging ${opponentName} <${opponentID}> (${opponentElo}) Played: ${opponentGames} Won: ${opponentWon}`)
		.setTimestamp()
	
	if (!queuedMatch) {
		sentEmbed = await logs.send({ content: `<@${opponentID}>`, embeds: [embed] })
		await sentEmbed.react("👍")
		await sentEmbed.react("👎")

		const collectorFilter = (reaction, user) => {
			return ['👍', '👎'].includes(reaction.emoji.name) && user.id === opponentID;
		}

		embed.setFooter({ text: `challenge ID: ${sentEmbed.id}` })
		await sentEmbed.edit({ embeds: [embed] })
		reactionCollector = await sentEmbed.awaitReactions({ filter: collectorFilter, max: 1, time: 3600000, errors: ['time'] }).catch(async error => {
			await logs.send(`<@${challengerID}> <@${opponentID}> did not respond in time.`)
			console.log(sentEmbed)
			await sentEmbed.delete({ timeout: 1000 })
			console.log(error)
			return {error: error}
		})

		// no reaction in time
		if (reactionCollector.error) return false
		
		reaction = reactionCollector.first()

		// challenge cancelled before expiration
		if (!reaction) return false

		if (reaction.emoji.name === '👍') {
			if (opponent.roles.cache.has(playing)) {
				await logs.send(`Challenge ${sentEmbed.id} initiated by <@${challengerID}> was cancelled because ${opponent.user.username} is already playing.`)
				await sentEmbed.delete({ timeout: 1000 })
				return false
			} else if (interaction.member.roles.cache.has(playing)) {
				await logs.send(`Challenge ${sentEmbed.id} initiated by <@${challengerID}> was cancelled they are already playing.`)
				await sentEmbed.delete({ timeout: 1000 })
				return false
			}
		} else if (reaction.emoji.name === '👎') {
			await sentEmbed.delete({ timeout: 1000 })
			await logs.send(`<@${challengerID}> ${opponent.user.username} rejected your challenge.`)
			return false
		}
	} else {
		sentEmbed = await logs.send({ embeds: [embed] })
	}
	
	if (challengerData.length === 0) {
		await dbConnection.execute('INSERT INTO `Crossy Road Elo Rankings` (name, id) VALUES (?, ?)', [challengerName, challengerID])
	}

	if (opponentData.length === 0) {
		await dbConnection.execute('INSERT INTO `Crossy Road Elo Rankings` (name, id) VALUES (?, ?)', [opponentName, opponentID])
	}
	
	if (!interaction.member.roles.cache.has(crossyoff)) {
		await interaction.member.roles.add(crossyoff)
	}
	
	if (!opponent.roles.cache.has(crossyoff)) {
		await opponent.roles.add(crossyoff)
	}
	
	embed.setTimestamp()
	embed.setFooter({ text: `Started challenge ID: ${sentEmbed.id}` })
	await sentEmbed.edit({ embeds: [embed] })
	await sentEmbed.reactions.removeAll()
	
	//create channel for match
	createdChannel = await interaction.guild.channels.create({
		name: `Challenge-${sentEmbed.id}`,
		type: ChannelType.GuildText,
		parent: "1171570995056881704",
		permissionOverwrites: [
			{
				id: everyone,
				deny: [PermissionFlagsBits.ViewChannel],
			},
			{
				id: interaction.client.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
			},
			/* uncomment when command finished to prevent uneccessary notifs
			{
				id: refs,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
			},*/
			{
				id: opponent.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
			},
			{
				id: interaction.user.id,
				allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
			},
		]
	})
	 
	if (interaction.member.roles.cache.has(queued)) {
		await interaction.member.roles.remove(queued)
	}
	
	if (opponent.roles.cache.has(queued)) {
		await opponent.roles.remove(queued)
	}
	
	await interaction.member.roles.add(playing)
	await opponent.roles.add(playing)

	rulesEmbed = new EmbedBuilder()
		.setColor("Blue")
		.setTitle("CrossyOff Challenge Rules")
		.setDescription("Rules: <http://crossyoff.rf.gd/rules/challenges.html>")
		.setFooter({ text: `challenge ID: ${sentEmbed.id} When finished ping @Referee` })
		.setTimestamp()
	
	await createdChannel.send({embeds: [rulesEmbed]})
	await dbConnection.end()
	return true
}

const challenge = {
	data: new SlashCommandBuilder()
		.setName("challenge")
		.setDescription("Play against a random user or add @user to challenge a user.")
		.addUserOption(option =>
			option.setName('opponent')
				.setDescription('The user to challenge.')),
	async execute(interaction) {
		const logs = interaction.guild.channels.cache.find(c => c.id === "1171571198023442535")
		let opponent = interaction.options.get("opponent")
		const playing = "1172359960559108116"
		const queued = "1172360108307644507"
		if (interaction.member.roles.cache.has(playing) || interaction.member.roles.cache.has(queued) ) {
			await interaction.reply("You are already queued/playing a challenge.")
		} else if (opponent) {
			if (opponent.user.id === interaction.user.id) {
				await interaction.reply("You cannot challenge yourself.")
			} else if (opponent.member.roles.cache.has(playing)) {
				await interaction.reply(`${opponent.user.username} is already in a challenge.`)
			} else if (opponent.user.bot) {
				await interaction.reply("You cannot challenge a bot")
			} else {
				await interaction.reply(`Attempting to create a challenge request in <#${logs.id}>.`)
				await createMatchRequest(interaction, opponent, logs, playing, queued, false) 
			}
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
				await logs.send({embeds: [embed]})
			} else {
				opponent = waiting.members.first()
				await interaction.reply(`You've been matched against ${opponent.user.username} see: <#${logs.id}>.`)
				await opponent.roles.remove(queued)
				await createMatchRequest(interaction, opponent, logs, playing, queued, true)
			} 
		}
	}
}

export default challenge
