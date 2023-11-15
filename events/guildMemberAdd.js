import { Events, EmbedBuilder, GuildMember } from 'discord.js'

const GuildMemberAdd = {
	name: Events.GuildMemberAdd,
	once: false,
    /**
     * Emitted whenever a user joins a guild.
     *
     * @param {GuildMember} member The member that has joined a guild.
     */
	async execute(member) {
		const logs = "682109939950288954"
        const channel = member.guild.channels.cache.get(logs)
        const embed = new EmbedBuilder()
        .setColor("Green")
        .setAuthor({ name: `${member.user.username} <${member.id}>`, iconURL: member.user.avatarURL() ? member.user.avatarURL() : member.user.defaultAvatarURL})
        .setTimestamp()
        .setFooter({ text: "Joined"})
        await channel.send({ embeds: [embed] })
	},
};

export default GuildMemberAdd
