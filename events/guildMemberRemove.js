import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js'

const GuildMemberRemove = {
	name: Events.GuildMemberRemove,
	once: false,
	async execute(member) {
                console.log("user left")
                const channel = member.guild.channels.cache.find(c => c.name === "development")
                const embed = new EmbedBuilder()
                .setColor("#6a0dad")
                .setAuthor({ name: `${member.user.username} <${member.id}>`, iconURL: member.user.avatarURL() ? member.user.avatarURL() : member.user.defaultAvatarURL})
                .setTimestamp();
                
                const fetchedLogs = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberKick,
                });
                
                fetchedLogs.entries
                .sort((a, b) => b.createdAt - a.createdAt) 
                .filter(a => a.targetId === member.id)

                
                console.log(fetchedLogs.entries.size)
                if (fetchedLogs.entries.size >= 1){
                        const firstEntry = fetchedLogs.entries.first().createdAt;
                        console.log(`user kicked: ${firstEntry > member.joinedAt}`)
                        if (firstEntry > member.joinedAt) 
                                return;
                } 
                channel.send({ embeds: [embed] });
	},
};

export default GuildMemberRemove
