import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js'
import mysql from 'mysql2/promise'
import { generateMoves, handleRunsCollector } from '../utilities/helper_functions.js'

/**
 * Creates a run
 * 
 * @param {ChatInputCommandInteraction} interaction
 */
async function createRun(interaction) {
    let runAttempts = 1
    const movesToDo = generateMoves()
    const logEmbed = new EmbedBuilder()
        .setColor("Yellow")
        .setAuthor({
            name: `${interaction.user.username} <${interaction.user.id}>`,
            iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
        })
        .addFields(
            { name: `Started Run ${runAttempts}`, value: `<t:${Math.floor(Date.now() / 1000)}> (${movesToDo})` }
        )
        .setTimestamp()
    await interaction.reply({ embeds: [logEmbed] })
    const interactionMessage = await interaction.fetchReply()
    logEmbed.setFooter({ text: `Started runs ${interactionMessage.id}` })
    await interaction.editReply({ embeds: [logEmbed] })
    // send a new embed which allows us to add a collector
    const movesEmbed = new EmbedBuilder()
        .setColor("Orange")
        .addFields(
            { name: 'Moves to do before starting run:', value: movesToDo }
        )
        .setFooter({ text: "Requested moves" })
        .setTimestamp()

    // create the buttons for the embed
    const nextRunButton = new ButtonBuilder()
        .setCustomId('nextrun')
        .setLabel('Next Run')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true)

    const endRunButton = new ButtonBuilder()
        .setCustomId('endrun')
        .setLabel('End Run')
        .setStyle(ButtonStyle.Danger);

    const endRunsButton = new ButtonBuilder()
        .setCustomId('endruns')
        .setLabel('End All Runs')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
        .addComponents(nextRunButton, endRunButton, endRunsButton);

    const sentEmbed = await interaction.channel.send({ embeds: [movesEmbed], components: [row] })
    const filter = (i) => i.user.id === interaction.user.id
    const collector = sentEmbed.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 18000000 * 3, // 5 hours per run, 3 runs total
        max: 5 // 5 actions total
    })

    // store run info to the database in case bots restarts
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

    await dbConnection.execute('INSERT INTO `Crossy Road Runs` (username, user_id, created, message_id, run_attempts, actions) VALUES (?, ?, ?, ?, ?, ?)', [interaction.user.username, interaction.user.id, sentEmbed.createdTimestamp, sentEmbed.id, runAttempts, 5])
    await dbConnection.end()
    // handle the button collector
    handleRunsCollector(interactionMessage, sentEmbed, collector, runAttempts)
}

const run = {
    data: new SlashCommandBuilder()
        .setName("run")
        .setDescription("Generates a move sequence before starting a run in a challenge."),
    async execute(interaction) {
        const challengeLobbyID = "1175955527688278016"
        // for challenges
        if (interaction.channel.name.includes("challenge") && interaction.channel.id !== challengeLobbyID) {
            const challengeID = interaction.channel.name.split("-")[1]
            const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")
            const challengeEmbed = await challengeLog.messages.fetch(challengeID)
            const challengerID = challengeEmbed.embeds[0].data.author.name.split('<')[1].split('>')[0]
            const opponentID = challengeEmbed.embeds[0].data.description.split('<')[1].split('>')[0]
            if (interaction.member.id === challengerID || interaction.member.id === opponentID) {
                createRun(interaction)
            } else {
                await interaction.reply("Only players can request runs.")
            }
            // for lcs
        } else if (interaction.channel.name === "lcs-runs" || interaction.channel.name === "development") {
            createRun(interaction)
        } else {
            await interaction.reply("You must be in a challenge or in #lcs-runs to use this command.")
        }
    }
}

export default run
