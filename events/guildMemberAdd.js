import { Events, EmbedBuilder } from 'discord.js'

const GuildMemberAdd = {
	name: Events.GuildMemberAdd,
	once: false,
	execute(member) {
		const channel = member.guild.channels.cache.find(c => c.name === "development")
        const embed = new EmbedBuilder()
        .setColor("008000")
        .setAuthor({ name: `${member.user.username} <${member.id}>`, iconURL: member.user.avatarURL() ? member.user.avatarURL() : member.user.defaultAvatarURL})
        .setTimestamp()
        .setFooter({ text: "Joined"});
        channel.send({ embeds: [embed] });
	},
};

export default GuildMemberAdd
