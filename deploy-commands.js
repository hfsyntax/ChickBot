import 'dotenv/config'
import { REST, Routes } from 'discord.js'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const commands = []
const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`)
	if ('data' in command.default && 'execute' in command.default) {
		commands.push(command.default.data.toJSON())
	} else {
		console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`)
	}
}

const rest = new REST().setToken(process.env.TOKEN)

try {
	console.log(`Started refreshing ${commands.length} application (/) commands.`)

	// refresh all commands in the guild with the current set
	const data = await rest.put(
		Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.SERVER_ID),
		{ body: commands }
	)

	console.log(`Successfully reloaded ${data.length} application (/) commands.`)
} catch (error) {
	console.error(error)
}