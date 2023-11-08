import { AuditLogEvent, Events, EmbedBuilder } from 'discord.js'

const GuildAuditLogEntryCreate = {
	name: Events.GuildAuditLogEntryCreate,
	once: false,
	async execute(auditLog, server) {
        const { action, executorId, targetId } = auditLog
        if (action === AuditLogEvent.MemberKick || action == AuditLogEvent.MemberBanAdd) {
            const executor = await server.members.fetch(executorId)
            const target = await server.members.client.users.fetch(targetId)
            const channel = server.channels.cache.find(c => c.name === "logs")
            const embed = new EmbedBuilder()
            .setAuthor({ name: `${executor.user.username} <${executor.id}>`, iconURL: executor.user.avatarURL() })
            .addFields(
                { name: 'User:', value: `${target.username} <${target.id}>` },
                { name: 'Reason:', value: auditLog.reason ? auditLog.reason : "no reason specified" },
            )
            .setTimestamp()
            
            if (action === AuditLogEvent.MemberKick) {
                embed.setFooter({ text: 'Kicked'})
                embed.setColor("#FFFF00")
            }

            if (action === AuditLogEvent.MemberBanAdd) {
                embed.setFooter({ text: 'Banned'})
                embed.setColor("#FF0000")
            }
            
            channel.send({ embeds: [embed] })
            
        }
	}
}

export default GuildAuditLogEntryCreate
