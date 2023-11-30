import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

function generateMoves() {
    const possibleMoves = ["LEFT", "RIGHT"]

    const movesArray = Array.from({ length: 4 }, () => possibleMoves[Math.floor(Math.random() * possibleMoves.length)])

    const movesTodo = movesArray.join(" ")

    return movesTodo
}

const run = {
    data: new SlashCommandBuilder()
        .setName("run")
        .setDescription("Generates a move sequence before starting a run in a challenge."),
    async execute(interaction) {
        const challengeLobbyID = "1175955527688278016"
        if (interaction.channel.name.includes("challenge") && interaction.channel.id !== challengeLobbyID) {
            const challengeID = interaction.channel.name.split("-")[1]
            const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")
            const challengeEmbed = await challengeLog.messages.fetch(challengeID)
            const challengerID = challengeEmbed.embeds[0].data.author.name.split('<')[1].split('>')[0]
            const opponentID = challengeEmbed.embeds[0].data.description.split('<')[1].split('>')[0]

            if (interaction.member.id === challengerID || interaction.member.id === opponentID) {
                const embed = new EmbedBuilder()
                .setColor("Yellow")
                .setAuthor({
                    name: `${interaction.user.username} <${interaction.user.id}>`,
                    iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
                })
                .addFields(
                    { name: 'Moves to do before starting run:', value: generateMoves() }
                )
                .setFooter({text: "Requested run"})
                .setTimestamp()
                await interaction.reply({embeds: [embed]})
            } else {
                await interaction.reply("Only players can request runs.")
            }
        } else {
            await interaction.reply("You must be in a challenge to use this command.")
        }
    }
}

export default run
