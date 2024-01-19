import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { Client, Events, GatewayIntentBits, Collection } from 'discord.js'
import express from 'express'
import bodyParser from 'body-parser'
import Pusher from 'pusher'
import 'dotenv/config'

const app = express()
const port = process.env.PORT || 3000;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildModeration
	]
})

const pusher = new Pusher({
	appId: process.env.PUSHER_APP_ID,
	key: process.env.PUSHER_APP_KEY,
	secret: process.env.PUSHER_APP_SECRET,
	cluster: 'us2',
	useTLS: true,
});

client.commands = new Collection()
const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
	const command = await import(`./commands/${file}`)
	console.log(`imported command file: ${file}`)
	if ('data' in command.default && 'execute' in command.default) {
		client.commands.set(command.default.data.name, command)
	} else {
		console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`)
	}
}

client.on(Events.MessageCreate, async message => {
	await pusher.trigger('discord-bot', 'new-message', {
		username: message.author.username,
		content: message.content,
	});
})

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return

	const command = interaction.client.commands.get(interaction.commandName)

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`)
		return
	}

	try {
		await command.default.execute(interaction)
	} catch (error) {
		console.error(error)
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
		}
	}
})

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))

for (const file of eventFiles) {
	const event = await import(`./events/${file}`)
	console.log(`imported event file: ${file}`)
	if (event.default.once) {
		client.once(event.default.name, (...args) => event.default.execute(...args))
	} else {
		client.on(event.default.name, (...args) => event.default.execute(...args))
	}
}

client.on('debug', (info) => {
	console.log(`Debug: ${info}`)
})

app.use(bodyParser.json())

app.post('/webhook', (req, res) => {
	const { event, data } = req.body;
	pusher.trigger('discord-bot', event, data);
	res.sendStatus(200);
})

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
})

await client.login(process.env.TOKEN)
