import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import mysql from 'mysql2/promise'

const elo = {
    data: new SlashCommandBuilder()
        .setName("elo")
        .setDescription("Retrieves a CrossyOff elo.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to lookup.')
                .setRequired(true)),
    async execute(interaction) {
        const dbConnection = await mysql.createConnection({
            host: process.env.DB_SERVERNAME,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DBNAME
        }).catch(async error => {
            await dbConnection.end()
            console.log(error.stack)
            return { error: error }
        })

        if (dbConnection.error) return await interaction.reply(`Database connection error, contact <@${interaction.guild.ownerId}>`)
        
        const user = interaction.options.get("user")
        const [userData] = await dbConnection.execute('SELECT * FROM `Crossy Road Elo Rankings` WHERE `id` = ?', [user.user.id])

        if (userData.length > 0) {
            await interaction.reply(`Fetching elo for ${user.user.username} please be patient.`)
            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({
                    name: `${userData[0].name} <${user.user.id}> (${userData[0].elo}) Played: ${userData[0].games} Won: ${userData[0].won}`,
                    iconURL: user.user.avatarURL() ? user.user.avatarURL() : user.user.defaultAvatarURL
                })
                .setTimestamp()
                .setFooter({ text: `Retrieved from crossyoff.rf.gd` })
            await interaction.channel.send({embeds: [embed]})
        } else {
            await interaction.reply("no results found.")
        }
    }
}

export default elo