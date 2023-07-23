const {
    Events
} = require('discord.js');

module.exports = {
    name: Events.ShardDisconnect,
    once: false,
    async execute(event, id) {
        console.log(`Shard ${id} disconnected from Discord with code ${event.code} and wasClean: ${event.wasClean}.`);
    },
};
