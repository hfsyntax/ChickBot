import { Events, EmbedBuilder } from 'discord.js'

const GuildBanAdd = {
    name: Events.GuildBanAdd,
    once: false,
    execute(ban) {
        const channel = ban.guild.channels.cache.find(c => c.name === "logs");
        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${ban.user.username} <${ban.user.id}>`,
                iconURL: ban.user.avatarURL()
            })
            .addFields({
                name: 'Reason:',
                value: `${ban.reason}`
            })
            .setColor("#FF0000")
            .setTimestamp()
            .setFooter({
                text: 'Banned'
            });  
        channel.send({
            embeds: [embed]
        });
    },
};

export default GuildBanAdd
