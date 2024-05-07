import { ButtonInteraction, EmbedBuilder, GuildMember, InteractionCollector, Message, PermissionFlagsBits, ChannelType } from 'discord.js'
import mysql from 'mysql2/promise'

/**
 * Generates a 4 move sequence to be performed before a run.
 * 
 * @returns {string} the move sequence
 */
function generateMoves() {
    const possibleMoves = ["LEFT", "RIGHT"]

    const movesArray = Array.from({ length: 4 }, () => possibleMoves[Math.floor(Math.random() * possibleMoves.length)])

    const movesTodo = movesArray.join(" ")

    return movesTodo
}


/**
 * Handles when the user interacts a run message button component
 * 
 * @param {Message} logEmbed - the embed recording the run logs
 * @param {Message} movesEmbed - the moves embed with buttons
 * @param {InteractionCollector} collector the discord.js message component collector
 * @param {Number} runAttempts - the amount of runs the user has left
 */
function handleRunsCollector(logEmbed, movesEmbed, collector, runAttempts) {
    collector.on("collect", async (interactor) => {
        // log into db to store collection
        const dbConnection = await mysql.createConnection({
            host: process.env.DB_SERVERNAME,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DBNAME
        }).catch(async error => {
            console.log(error.stack)
            return { error: error }
        })

        if (dbConnection.error) {
            await movesEmbed.channel.send({ content: `Database connection error, contact <@${movesEmbed.guild.ownerId}>` })
            return collector.stop("database connection error.")
        }

        // only send interaction reply once
        if (!interactor.replied || interactor.deferred) {
            await interactor.reply({ content: "foobar" })
            await interactor.deleteReply()
        }

        // actionRowBuilder for buttons
        const row = interactor.message.components[0]
        const nextRunButton = row.components[0]
        const endRunButton = row.components[1]

        if (interactor.customId === "endruns") {
            logEmbed.embeds[0].data.fields.push({
                name: `Ended all Runs`,
                value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
                inline: false
            })
            await dbConnection.execute('DELETE FROM `Crossy Road Runs` WHERE message_id = ?', [movesEmbed.id])
            await logEmbed.edit({ embeds: [logEmbed.embeds[0]] })
            await movesEmbed.delete({ timeout: 1000 })
            await dbConnection.end()
        }
        else if (interactor.customId === "nextrun") {
            // set new moves and update timestamp to the moves embed for each run
            const movesToDo = generateMoves()
            movesEmbed.embeds[0].data.fields[0].value = movesToDo
            movesEmbed.embeds[0].data.timestamp = new Date(Date.now())
            // enable end run button again
            nextRunButton.data.disabled = true
            endRunButton.data.disabled = false
            await movesEmbed.edit({ embeds: [movesEmbed.embeds[0]], components: [row] })
            // add the time started for each run to the interaction embed
            logEmbed.embeds[0].data.fields.push({
                name: `Started Run ${runAttempts}`,
                value: `<t:${Math.floor(Date.now() / 1000)}> (${movesToDo})`,
                inline: false
            })
            await logEmbed.edit({ embeds: [logEmbed.embeds[0]] })
            await dbConnection.execute('UPDATE `Crossy Road Runs` SET actions = actions - 1 WHERE message_id = ? ', [movesEmbed.id])
            await dbConnection.end()
        } else if (interactor.customId === "endrun") {
            // enable next run button again
            nextRunButton.data.disabled = false
            endRunButton.data.disabled = true
            await movesEmbed.edit({ embeds: [movesEmbed.embeds[0]], components: [row] })
            logEmbed.embeds[0].data.fields.push({
                name: `Ended Run ${runAttempts}`,
                value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
                inline: false
            })
            await logEmbed.edit({ embeds: [logEmbed.embeds[0]] })

            if (runAttempts === 3) {
                logEmbed.embeds[0].data.fields.push({
                    name: `Ended all Runs`,
                    value: `<t:${Math.floor(Date.now() / 1000)}> (${Date.now()})`,
                    inline: false
                })
                await logEmbed.edit({ embeds: [logEmbed.embeds[0]] })
                await dbConnection.execute('DELETE FROM `Crossy Road Runs` WHERE message_id = ?', [movesEmbed.id])
                await movesEmbed.delete({ timeout: 1000 })
                await dbConnection.end()
            } else {
                runAttempts++
                await dbConnection.execute('UPDATE `Crossy Road Runs` SET run_attempts = ?, actions = actions - 1  WHERE message_id = ?', [runAttempts, movesEmbed.id])
                await dbConnection.end()
            }
        }
    })

    collector.on("end", async (collected, reason) => {
        console.log(`collector has ended due to reason: ${reason}`)
    })
}

/**
 * Handles when the user interacts with a challenge message button component
 * 
 * @param {Message} sentEmbed - the embed sent containing the challenge
 * @param {GuildMember} challenger - the member who created the challenge
 * @param {InteractionCollector} collector the discord.js message component collector
 */
function handleChallengeCollector(sentEmbed, challenger, collector) {
    collector.on("collect", async (interactor) => {
        const playing = "1172359960559108116"

        // only send interaction reply once
        if (!interactor.replied || interactor.deferred) {
            await interactor.reply({ content: "foobar" })
            await interactor.deleteReply()
        }

        // if the challenger is already playing
        if (challenger.roles.cache.has(playing)) {
            sentEmbed.embeds[0].data.color = 15548997
            sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
            sentEmbed.embeds[0].data.fields.push(
                { name: 'Reason:', value: "Challenger is already playing" }
            )
            await sentEmbed.edit({ content: `<@${interactor.user.id}>`, embeds: [sentEmbed.embeds[0]], components: [] })
        }
        // if the person challenged is already playing
        else if (interactor.member.roles.cache.has(playing)) {
            sentEmbed.embeds[0].data.color = 15548997
            sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
            sentEmbed.embeds[0].data.fields.push(
                { name: 'Reason:', value: "Opponent is already playing" }
            )
            await sentEmbed.edit({ content: `<@${challenger.id}>`, embeds: [sentEmbed.embeds[0]], components: [] })
        }

        else if (interactor.customId === "accept") {
            await startChallenge(sentEmbed, challenger, interactor)

        } else if (interactor.customId === "reject") {
            sentEmbed.embeds[0].data.color = 15548997
            sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
            sentEmbed.embeds[0].data.fields.push(
                { name: 'Reason:', value: "Opponent rejected challenge" }
            )
            await sentEmbed.edit({ content: `<@${challenger.id}>`, embeds: [sentEmbed.embeds[0]], components: [] })
            // log into db to delete saved button collector
            const dbConnection = await mysql.createConnection({
                host: process.env.DB_SERVERNAME,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DBNAME
            }).catch(async error => {
                console.log(error.stack)
                return { error: error }
            })

            if (dbConnection.error) {
                await interactor.channel.send({ content: `Database connection error, contact <@${interactor.guild.ownerId}>` })
                return collector.stop("database connection error.")
            }
            await dbConnection.execute('DELETE FROM `Crossy Road Challenges` WHERE message_id = ?', [sentEmbed.id])
            await dbConnection.end()
        }
    })

    collector.on("end", async (collected, reason) => {
        console.log(`collector stopped due to reason: ${reason}`)
        if (reason === "time") {
            sentEmbed.embeds[0].data.color = 15548997
            sentEmbed.embeds[0].data.footer = {text: `Cancelled challenge ID: ${sentEmbed.id}`}
            sentEmbed.embeds[0].data.fields.push(
                { name: 'Reason:', value: "opponent did not respond in time" }
            )
            await sentEmbed.edit({ content: `<@${challenger.id}>`, embeds: [sentEmbed.embeds[0]], components: [] })
            // log into db to delete saved button collector
            const dbConnection = await mysql.createConnection({
                host: process.env.DB_SERVERNAME,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DBNAME
            }).catch(async error => {
                console.log(error.stack)
                return { error: error }
            })

            if (dbConnection.error) {
                await interactor.channel.send({ content: `Database connection error, contact <@${interactor.guild.ownerId}>` })
                return collector.stop("database connection error.")
            }
            await dbConnection.execute('DELETE FROM `Crossy Road Challenges` WHERE message_id = ?', [sentEmbed.id])
            await dbConnection.end()
        }

    })
}

/**
 * Starts a challenge once its accepted
 * 
 * @param {Message} sentEmbed - the embed sent containing the challenge
 * @param {GuildMember} challenger - the member who created the challenge
 * @param {ButtonInteraction} interaction - the interactor with the button
 */
async function startChallenge(sentEmbed, challenger, interaction) {
    sentEmbed.embeds[0].data.timestamp = new Date(Date.now())
    sentEmbed.embeds[0].data.footer = {text: `Started challenge ID: ${sentEmbed.id}`}
    await sentEmbed.edit({ content: '', embeds: [sentEmbed.embeds[0]], components: [] })
    const everyone = "600865413890310155"
    const refs = "799505175541710848"
    const queued = "1172360108307644507"
    const playing = "1172359960559108116"
    //create channel for match
    const createdChannel = await interaction.guild.channels.create({
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
            /*{
                id: refs,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },*/
            {
                id: challenger.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ]
    })

    // if the match is queued we remove both users queue roles
    if (interaction.member.roles.cache.has(queued)) {
        await interaction.member.roles.remove(queued)
    }

    if (challenger.roles.cache.has(queued)) {
        await challenger.roles.remove(queued)
    }

    await interaction.member.roles.add(playing)
    await challenger.roles.add(playing)

    const rulesEmbed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("CrossyOff Challenge Rules")
        .setDescription("Rules: <https://crossyoff.rf.gd/rules/challenges.php>")
        .setFooter({ text: `challenge ID: ${sentEmbed.id} When finished ping @Referee` })
        .setTimestamp()
        .addFields(
            { name: 'Important Rule Highlights', value: "- all runs must be recorded and have a savable link\n- do not open Crossy Road until after the recording has started\n- use `/run` before starting your runs" }
        )

    await createdChannel.send({ content: `<@${interaction.user.id}> <@${challenger.id}>`, embeds: [rulesEmbed] })
}

export { generateMoves, handleRunsCollector, handleChallengeCollector, startChallenge }