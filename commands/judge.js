//test using donovan in opera and brian in chrome
import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from 'discord.js'
import mysql from 'mysql2/promise'
import {calculateElo} from '../utilities/calculateElo.js'

const judge = {
    data: new SlashCommandBuilder()
        .setName("judge")
        .setDescription("Judges a finished challenge.")
        .addUserOption(option =>
            option.setName('player1')
                .setDescription('The first player.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('score1')
                .setDescription('The first score.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('player2')
                .setDescription('The second player.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('score2')
                .setDescription('The second score.')
                .setRequired(true)),  
    async execute(interaction) {
        const referee = "799505175541710848"
        const playing = "1172359960559108116"
        if (interaction.member.roles.cache.has(referee)) {
            if (interaction.channel.name.includes("challenge")) {
                const player1 = interaction.options.get("player1")
                const player1ID = player1.user.id
                const score1 = interaction.options.get("score1").value
                const player2 = interaction.options.get("player2")
                const player2ID = player2.user.id
                const score2 = interaction.options.get("score2").value
                const players = interaction.channel.members.filter(m => !m.user.bot && m.roles.cache.has(playing))
                const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")

                if (!players.has(player1ID) || !players.has(player2ID)) {
                    await interaction.reply("Supplied players must be in the same channel.")
                } else if (player1ID === player2ID) {
                    await interaction.reply("Player 1 cannot be the same as player 2.")
                } else if (players.has(interaction.user.id)) {
                    await interaction.reply("You cannot judge your own challenge.")
                } else if (score1 < 0 || score2 < 0) {
                    await interaction.reply("neither score can be negative.")
                } else {
                    const challengeID = interaction.channel.name.split("-")[1]
                    await interaction.reply(`Attempting to judge challenge ID: ${challengeID}`)
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
                
                    if (dbConnection.error) return await interaction.channel.send(`Error connecting to the database. Contact <@${interaction.guild.ownerId}>`)
                    
                    //fetch each players data based on id
                    const [player1Data] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [player1ID])
	                const [player2Data] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [player2ID])
                    const initalPlayer1Elo = player1Data[0].elo
                    const initalPlayer2Elo = player2Data[0].elo
                    let winnerID = 0
                    //calculate elo based on score
                    if (score1 > score2) {
                        calculateElo(player1Data[0], player2Data[0], 1)
                        winnerID = player1ID
                    } else if (score1 < score2) {
                        calculateElo(player1Data[0], player2Data[0], 0)
                        winnerID = player2ID
                    } else {
                        calculateElo(player1Data[0], player2Data[0], 0.5)
                    }
                    
                    //update rows in crossy road elo rankings
                    await dbConnection.execute('UPDATE `Crossy Road Elo Rankings` SET `elo` = ?, games = ?, won = ? WHERE `id` = ?', [player1Data[0].elo, player1Data[0].games, player1Data[0].won,  player1ID])
                    await dbConnection.execute('UPDATE `Crossy Road Elo Rankings` SET `elo` = ?, games = ?, won = ? WHERE `id` = ?', [player2Data[0].elo, player2Data[0].games, player2Data[0].won, player2ID])
                    
                    //convert player1/player2 params to challenger/oppoent
                    const challengeMessage = await challengeLog.messages.fetch(challengeID)
                    const challengerID = challengeMessage.embeds[0].data.author.name.match(/<(.*?)>/)[1]
                    const challenerName = challengerID === player1ID ? player1Data[0].name : player2Data[0].name
                    const challengerPlayed = challengerID === player1ID ? player1Data[0].games : player2Data[0].games
                    const challengerWon = challengerID === player1ID ? player1Data[0].won : player2Data[0].won
                    const challengerInitalElo = challengerID === player1ID ? initalPlayer1Elo : initalPlayer2Elo
                    const challengerFinalElo = challengerID === player1ID ? player1Data[0].elo : player2Data[0].elo
                    const challengerScore = challengerID === player1ID ? score1 : score2
                    const challengerResult = winnerID === challengeID ? "Won" : "Lost"
                    const opponentID = challengerID !== player1ID ? player1ID : player2ID
                    const opponentName = challengerID !== player1ID ? player1Data[0].name : player2Data[0].name
                    const opponentPlayed = challengerID !== player1ID ? player1Data[0].games : player2Data[0].games
                    const opponentWon = challengerID !== player1ID ? player1Data[0].won : player2Data[0].won
                    const opponentInitalElo = challengerID !== player1ID ? initalPlayer1Elo : initalPlayer2Elo
                    const opponentFinalElo = challengerID !== player1ID ? player1Data[0].elo : player2Data[0].elo
                    const opponentScore = challengerID !== player1ID ? score1 : score2
                    const opponentResult = winnerID === opponentID ? "Won" : "Lost"
                    
                    //insert rows in crossy road challenges
                    const fields = "challenger_id, opponent_id, winner_id, challenger_initial_elo, challenger_final_elo, challenger_score, opponent_initial_elo, opponent_final_elo, opponent_score"
                    await dbConnection.execute(`INSERT INTO \`Crossy Road Challenges\` (${fields}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [challengerID, opponentID, winnerID, challengerInitalElo, challengerFinalElo, challengerScore, opponentInitalElo, opponentFinalElo, opponentScore])
                    //update all player ranks
                    await dbConnection.execute("SET @rank = 0;")
                    await dbConnection.execute("UPDATE `Crossy Road Elo Rankings` SET rank = (@rank := @rank + 1) ORDER BY elo DESC;");

                    //send log to challenge-logs with data changes
                    const embed = new EmbedBuilder()
                    .setColor("Orange")
                    .setAuthor({
                        name: `Referee: ${interaction.user.username} <${interaction.user.id}>`,
                        iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
                    })
                    .addFields(
                        { name: `Challenger (${challengerResult})`, value: `${challenerName} (${challengerInitalElo}-${challengerFinalElo}) Played: ${challengerPlayed} Won: ${challengerWon} Score: ${challengerScore}` },
                        { name: `Opponent (${opponentResult})`, value: `${opponentName} (${opponentInitalElo}-${opponentFinalElo}) Played: ${opponentPlayed} Won: ${opponentWon} Score: ${opponentScore}` },
                    )
                    .setTimestamp()
                    .setFooter({text: `challenge ID: ${challengeID}`})
                    await challengeMessage.delete({timeout: 1000})
                    await challengeLog.send({embeds: [embed]})
                    await player1.member.roles.remove(playing)
                    await player2.member.roles.remove(playing)
                    await interaction.channel.delete({timeout: 1000})
                    await dbConnection.end()
                }
            } else {
                await interaction.reply("You must be in a created challenge channel to use this command.")
            }
        } else {
            await interaction.reply("You do not have permission to use this command.")
        }

    }
}

export default judge
