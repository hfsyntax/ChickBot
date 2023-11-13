import { SlashCommandBuilder, EmbedBuilder} from 'discord.js'

const cancel = {
	data: new SlashCommandBuilder()
		.setName("cancel")
		.setDescription("Cancels a queue/challenge request."),
	async execute(interaction) {
        try {
            const logs = interaction.guild.channels.cache.get("1171571198023442535")
            const playing = "1172359960559108116"
            const queued = "1172360108307644507"
            if (interaction.member.roles.cache.has(playing)) {
                return await interaction.reply("You cannot cancel a challenge when you are already playing.")
            }
            if (interaction.member.roles.cache.has(queued)) {
                await interaction.member.roles.remove(queued)
                await interaction.reply("You've been removed from the queue of players waiting for a challenge.")
                const embed = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({
                    name: `${interaction.user.username} <${interaction.user.id}>`,
                    iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
                })
                .setFooter({ text: "Cancelled qeue for challenge" })
                .setTimestamp()
                await logs.send({embeds: [embed]})
            } else {
                const messages = await logs.messages.fetch({limit: 30})
                const challenge = messages.filter(m => 
                    m.embeds.length === 1 &&
                    m.embeds[0].data.author.name &&
                    m.embeds[0].data.author.name.split('<')[1].split('>')[0]
                    === interaction.member.id
                )
                if (challenge.size > 0) {
                    const embed = new EmbedBuilder()
                    .setColor("Red")
                    .setAuthor({
                        name: `${interaction.user.username} <${interaction.user.id}>`,
                        iconURL: interaction.user.avatarURL() ? interaction.user.avatarURL() : interaction.user.defaultAvatarURL
                    })
                    .setFooter({ text: `Cancelled challenge ID: ${challenge.first().id}` })
                    .setTimestamp()
                    await logs.send({embeds: [embed]})
                    await challenge.first().delete({timeout: 1000})
                    await interaction.reply("Sucessfully cancelled your challenge.")
                } else {
                    await interaction.reply("You have not created a challenge and you are not in a queue.")
                }
            }
        } catch (error) {
            console.log(error)
            await interaction.reply(`Error cancelling  your challenge. Report this to <@${interaction.guild.ownerId}>`)
        }
	}
}

export default cancel
