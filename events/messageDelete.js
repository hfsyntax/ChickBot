const {
    Events,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    execute(message) {
        if (!message.guild || message.embeds[0]) return
        const channel = message.guild.channels.cache.find(c => c.name === "logs")
        const embed = new EmbedBuilder()
            .setColor("808080")
            .setAuthor({
                name: `${message.author.username} <${message.author.id}>`,
                iconURL: message.author.avatarURL()
            })
            .addFields({
                name: 'Channel',
                value: message.channel.name
            }, {
                name: 'Message',
                value: message.content.replace(/@/g, '@ ')
            }, )
            .setTimestamp()
            .setFooter({
                text: 'Deleted'
            });

        channel.send({
            embeds: [embed]
        });
    },
};
