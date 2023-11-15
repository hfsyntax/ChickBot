import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js'

const GuildMemberRemove = {
	name: Events.GuildMemberRemove,
	once: false,
        /**
         * Emitted whenever a member leaves a guild.
         *
         * @param {GuildMember} member The member that has left from the guild.
         */
	async execute(member) {
                const logs = "682109939950288954"
                const channel = member.guild.channels.cache.get(logs)
                const embed = new EmbedBuilder()
                .setColor("Purple")
                .setAuthor({ name: `${member.user.username} <${member.id}>`, iconURL: member.user.avatarURL() ? member.user.avatarURL() : member.user.defaultAvatarURL})
                .setTimestamp()
                
                const fetchedKicks = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberKick,
                });
                
                fetchedKicks.entries
                .sort((a, b) => b.createdAt - a.createdAt) 
                .filter(a => a.targetId === member.id)

                if (fetchedKicks.entries.size >= 1){
                        const firstEntry = fetchedKicks.entries.first().createdAt
                        if (firstEntry > member.joinedAt) 
                                return
                } 
                
                const fetchedBans = await member.guild.fetchAuditLogs({
                        type: AuditLogEvent.MemberBanAdd,
                });
                
                fetchedBans.entries
                .sort((a, b) => b.createdAt - a.createdAt) 
                .filter(a => a.targetId === member.id)

                
                if (fetchedBans.entries.size >= 1){
                        const firstEntry = fetchedBans.entries.first().createdAt
                        if (firstEntry > member.joinedAt) 
                                return
                } 
                await channel.send({ embeds: [embed] })
	}
}

export default GuildMemberRemove
