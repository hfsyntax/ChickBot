import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'

const cancel = {
    data: new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancels a queue/challenge request.")
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("The reason for cancelling.")),
    async execute(interaction) {
        const challengeLog = interaction.guild.channels.cache.get("1171571198023442535")
        const challengeLobbyID = "1175955527688278016"
        const playing = "1172359960559108116"
        const queued = "1172360108307644507"
        const referee = "799505175541710848"
        const reason = interaction.options.get("reason")
        const embed = new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
                name: `${interaction.user.username} <${interaction.user.id}>`,
                iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
            })
            .setTimestamp()
            .addFields(
                { name: 'Reason:', value: reason ? reason.value : "no reason specified" }
            )

        // challenge and not challenge lobby
        if (interaction.channel.name.includes("challenge") && interaction.channel.id !== challengeLobbyID) {
            if (interaction.member.roles.cache.has(referee)) {
                const challengeID = interaction.channel.name.split("-")[1]
                const challengeEmbed = await challengeLog.messages.fetch(challengeID)
                const challengerID = challengeEmbed.embeds[0].data.author.name.split('<')[1].split('>')[0]
                const opponentID = challengeEmbed.embeds[0].data.description.split('<')[1].split('>')[0]
                if (interaction.member.id === challengerID || interaction.member.id === opponentID) {
                    await interaction.reply("You cannot cancel a challenge you are already playing.")
                } else {
                    const challenger = interaction.channel.members.get(challengerID)
                    const opponent = interaction.channel.members.get(opponentID)
                    //check in case either leaves the server
                    if (challenger)
                        await challenger.roles.remove(playing)
                    if (opponent)
                        await opponent.roles.remove(playing)
                    embed.setFooter({ text: `Referee cancelled challenge ID: ${challengeID}` })
                    await challengeLog.send({ embeds: [embed] })
                    await interaction.reply(`Sucessfully cancelled challenge ID: ${challengeID}.`)
                    await interaction.channel.delete({ timeout: 1000 })
                }
            } else {
                await interaction.reply("You cannot cancel a challenge you are already playing.")
            }
        } else {
            if (interaction.member.roles.cache.has(playing)) {
                await interaction.reply("You cannot cancel a challenge when you are already playing.")
            }
            else if (interaction.member.roles.cache.has(queued)) {
                await interaction.member.roles.remove(queued)
                await interaction.reply("You've been removed from the queue of players waiting for a challenge.")
                embed.setFooter({ text: "Cancelled qeue for challenge" })
                await challengeLog.send({ embeds: [embed] })
            } else {
                const messages = await challengeLog.messages.fetch({ limit: 30 })
                const challenge = messages.filter(m =>
                    m.embeds.length === 1 &&
                    m.embeds[0].data.author.name &&
                    m.embeds[0].data.author.name.split('<')[1].split('>')[0]
                    === interaction.member.id &&
                    m.reactions.cache.size > 0
                )
                if (challenge.size > 0) {
                    embed.setFooter({ text: `Cancelled challenge ID: ${challenge.first().id}` })
                    await challengeLog.send({ embeds: [embed] })
                    await interaction.reply("Sucessfully cancelled your challenge.")
                } else {
                    await interaction.reply("You have not created a challenge and you are not in a queue.")
                }
            }
        }
    }
}

export default cancel
