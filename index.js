import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { Client, Events, GatewayIntentBits, Collection } from 'discord.js'
import 'dotenv/config'

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration
	]
})

client.commands = new Collection()
const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))
for (const file of commandFiles) {
	const command = await import(`./commands/${file}`)
	if ('data' in command.default && 'execute' in command.default) {
		client.commands.set(command.default.data.name, command)
	} else {
		console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`)
	}
}

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
	if (event.default.once) {
		client.once(event.default.name, (...args) => event.default.execute(client, ...args))
	} else {
		client.on(event.default.name, (...args) => event.default.execute(client, ...args))
	}
}

client
	.on("debug", console.log)
	.on("warn", console.log)

client.login(process.env.TOKEN)
