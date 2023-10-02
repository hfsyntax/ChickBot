const {
    Events
} = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: false,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};
