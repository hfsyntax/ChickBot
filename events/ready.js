import { Events } from 'discord.js'

const ready = {
	name: Events.ClientReady,
	once: false,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};

export default ready
