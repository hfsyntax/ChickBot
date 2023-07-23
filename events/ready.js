const {
    Events
} = require('discord.js');
const heartbeatInterval = 5 * 60 * 1000; // 5 minutes

function sendHeartbeat(client) {
    try {
        console.log(`Heartbeat sent successfully: ${client.ws.ping}`);
    } catch (error) {
        console.error('Error sending heartbeat:', error);
    }
}

module.exports = {
    name: Events.ClientReady,
    once: false,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        console.log(`WebSocket Status: ${client.ws.status}`);
        setInterval(() => sendHeartbeat(client), heartbeatInterval);
    },
};
