import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, CommandInteraction, User, GuildMember, TextChannel, Message } from 'discord.js'
import mysql from 'mysql2/promise'

/**
 * Creates a match request for a challenger and opponent.
 *
 * @param {CommandInteraction} interaction - The interaction sent from the slash command.
 * @param {GuildMember|CommandInteraction} opponent - The user who was challenged.
 * @param {TextChannel} logs - The channel to log events in.
 * @param {boolean} queuedMatch - Whether the match was queued.
 * @throws {Error} Throws an error if the database cannot be connected to.
 */
async function createMatchRequest(interaction, opponent, logs, queuedMatch) {
	try {
		const dbConnection = await mysql.createConnection({
			host: process.env.DB_SERVERNAME,
			user: process.env.DB_USERNAME,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DBNAME
		})
		const [queryChallenger] = await dbConnection.execute('SELECT id FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [interaction.user.id])
		if (queryChallenger.length === 0) {
			await dbConnection.execute('INSERT IGNORE INTO `Crossy Road Elo Rankings` (name, id) VALUES (?, ?)', [interaction.member.user.username, interaction.user.id])
		}
		const [queryOpponent] = await dbConnection.execute('SELECT id FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [opponent.user.id])
		if (queryOpponent.length === 0) {
			await dbConnection.execute('INSERT IGNORE INTO `Crossy Road Elo Rankings` (name, id) VALUES (?, ?)', [opponent.user.username, opponent.user.id])
		}
		const [challengerData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [interaction.user.id])
		const [opponentData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [opponent.user.id])
		const challengerLost = challengerData[0].games - challengerData[0].won
		const opponentLost = opponentData[0].games - opponentData[0].won
		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({
				name: `${challengerData[0].name} <${interaction.user.id}> (${challengerData[0].elo}) ${challengerData[0].won}-${challengerLost}`,
				iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
			})
			.setDescription(`Challenging ${opponentData[0].name} <${opponent.user.id}> (${opponentData[0].elo}) ${opponentData[0].won}-${opponentLost}`)
			.setTimestamp()
		let challengeEmbed
		if (!queuedMatch) {
			challengeEmbed = await logs.send({ content: `<@${opponent.user.id}>`, embeds: [embed] })
			await challengeEmbed.react("👍")
			await challengeEmbed.react("👎")
		} else {
			challengeEmbed = await logs.send({ embeds: [embed] })
		}
		
		return { "embed": embed, "sentEmbed": challengeEmbed, "challenger": challengerData, "opponent": opponentData}
	} catch (error) {
		await interaction.channel.send(`Database connection error, report this to <@${interaction.guild.ownerId}>`)
		throw new Error(error)
	}

}

/**
 * Handles a reaction created from a match request.
 *
 * @param {CommandInteraction} interaction - The interaction sent from the slash command.
 * @param {GuildMember|CommandInteraction} opponent - The user who was challenged.
 * @param {EmbedBuilder} embed - The embed created from createMatchRequest.
 * @param {Message} sentEmbed - The sent message containing the embed created from createMatchRequest.
 * @param {TextChannel} logs - The channel to log events in.
 * @param {string} playing - The role id for the playing role.
 * @param {string} queued - The role id for the queued role.
 * @param {boolean} queuedMatch - Whether the match was queued.
 * @throws {Error} Throws an error if the database cannot be connected to.
 */
async function handleReaction(interaction, opponent, embed, sentEmbed, logs, playing, queued, queuedMatch) { 
	const everyone = "600865413890310155"
	const refs = "799505175541710848"
	opponent = opponent.member ? opponent.member : opponent
	try {
		let cancelled = false
		if (!queuedMatch) {
			const collectorFilter = (reaction, user) => {
				return ['👍', '👎'].includes(reaction.emoji.name) && user.id === opponent.user.id;
			}
	
			embed.setFooter({ text: `challenge ID: ${sentEmbed.id}` })
			await sentEmbed.edit({ embeds: [embed] })
			const reactionCollector = await sentEmbed.awaitReactions({ filter: collectorFilter, max: 1, time: 3600000, errors: ['time'] })
			const reaction = reactionCollector.first()

			if (reaction.emoji.name === '👍') {
				if (opponent.roles.cache.has(playing)) {
					cancelled = true
					await logs.send(`Challenge ${sentEmbed.id} initiated by <@${interaction.user.id}> was cancelled because ${opponent.user.username} is already playing.`)
					return await sentEmbed.delete({ timeout: 1000 })
				} else if (interaction.member.roles.cache.has(playing)) {
					cancelled = true
					await logs.send(`Challenge ${sentEmbed.id} initiated by <@${interaction.user.id}> was cancelled because ${interaction.user.username} is already playing.`)
					return await sentEmbed.delete({ timeout: 1000 })
				}
			} else if (reaction.emoji.name === '👎') {
				await sentEmbed.delete({ timeout: 1000 })
				return await logs.send(`<@${interaction.user.id}> ${opponent.user.username} rejected your challenge.`)
			}
		} 
		
		embed.setTimestamp()
		embed.setFooter({ text: `Started challenge ID: ${sentEmbed.id}` })
		await sentEmbed.edit({ embeds: [embed] })
		await sentEmbed.reactions.removeAll()
		//create channel for match
		const channel = await interaction.guild.channels.create({
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

		const rulesEmbed = new EmbedBuilder()
			.setColor("Blue")
			.setTitle("CrossyOff Challenge Rules")
			.setDescription("Rules: <http://crossyoff.rf.gd/rules/challenges.html>")
			.setFooter({ text: `challenge ID: ${sentEmbed.id} When finished ping @Referee` })
			.setTimestamp()
		await channel.send({embeds: [rulesEmbed]})
		
	} catch (error) {
		if (!cancelled) {
			await logs.send(`<@${interaction.user.id}> ${opponent.user.username} did not respond in time.`)
			await sentEmbed.delete({ timeout: 1000 })
		}
		throw new Error(error)
	}
}

const challenge = {
	data: new SlashCommandBuilder()
		.setName("challenge")
		.setDescription("Play against a random user or add @user to challenge a user.")
		.addUserOption(option =>
			option.setName('opponent')
				.setDescription('The user to challenge.')),
	async execute(interaction) {
		//challenger is part of interaction, therefore challenger not needed
		const logs = interaction.guild.channels.cache.find(c => c.id === "1171571198023442535")
		let opponent = interaction.options.get("opponent")
		const playing = "1172359960559108116"
		const queued = "1172360108307644507"
		if (interaction.member.roles.cache.has(playing) || interaction.member.roles.cache.has(queued) ) {
			return await interaction.reply("You are already queued/playing a challenge.")
		} else if (opponent) {
			if (opponent.user.id === interaction.user.id) {
				return await interaction.reply("You cannot challenge yourself.")
			} else if (opponent.member.roles.cache.has(playing)) {
				return await interaction.reply(`${opponent.user.username} is already in a challenge.`)
			} else if (opponent.user.bot) {
				return await interaction.reply("You cannot challenge a bot")
			}
			try {
				await interaction.reply(`Attempting to create a challenge request in <#${logs.id}>.`)
				const match = await createMatchRequest(interaction, opponent, logs, false) 
				return await handleReaction(interaction, opponent, match.embed, match.sentEmbed, logs, playing, queued, false)
			} catch (error) {
				console.log(error)
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
				return await logs.send({embeds: [embed]})
			} else {
				try {
					opponent = waiting.members.first()
					await interaction.reply(`You've been matched against ${opponent.user.username} see: <#${logs.id}>.`)
					await opponent.roles.remove(queued)
					const match = await createMatchRequest(interaction, opponent, logs, true)
					return await handleReaction(interaction, opponent, match.embed, match.sentEmbed, logs, playing, queued, true)
				} catch (error) {
					console.log(error)
				}
			} 
		}
	}
};

export default challenge
