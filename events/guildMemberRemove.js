const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
name: Events.GuildMemberRemove,
once: false,
  async execute(member) {
        const channel = member.guild.channels.cache.find(c => c.name === "logs")
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
  
        if (fetchedLogs.entries.size >= 1){
                const firstEntry = fetchedLogs.entries.first().createdAt;
                if (firstEntry > member.joinedAt) 
                        return;
        } 
        channel.send({ embeds: [embed] });
  },
};
