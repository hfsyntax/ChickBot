
const { Events, WebhookClient, EmbedBuilder } = require('discord.js');
const heartbeatInterval = 5 * 60 * 1000; // 5 minutes
const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_URL });

async function sendHeartbeat(client) {
	try {
	  const ping = client.ws.ping;
	  console.log(`Heartbeat sent successfully: ${ping}`);
	} catch (error) {
	  console.error('Error sending heartbeat:', error);
	  try {
			const embed = new EmbedBuilder()
			.setColor("#808080")
			.setAuthor({ name: `${client.user.username} <${client.user.id}>`, iconURL: client.user.avatarURL() })
			.setTimestamp()
        	.setFooter({ text: "Offline"});

			await webhookClient.send({
				embeds: [embed],
			});
		} catch (err) {
			console.error('Error sending webhook message for the error:', err);
		}
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
