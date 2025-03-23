import { REST, Routes } from "discord.js"
import fs from "fs"
import path, { dirname } from "path"
import { fileURLToPath } from "url"

const commands = []
const __dirname: string = dirname(fileURLToPath(import.meta.url))
const commandsPath: string = path.join(__dirname, "../commands")
const commandFiles: string[] = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"))
for (const file of commandFiles) {
  const command = await import(`../commands/${file}`)
  if ("data" in command.default && "execute" in command.default) {
    commands.push(command.default.data.toJSON())
  } else {
    console.log(
      `[WARNING] The command at ${file} is missing a required "data" or "execute" property.`
    )
  }
}

if (!process.env.TOKEN) throw new Error("Missing token evironment variable.")

if (!process.env.CLIENT_ID)
  throw new Error("Missing discord client id evironment variable.")

if (!process.env.SERVER_ID)
  throw new Error("Missing discord server id evironment variable.")

const rest = new REST().setToken(process.env.TOKEN)

try {
  console.log(`Started refreshing ${commands.length} application (/) commands.`)

  // refresh all commands in the guild with the current set
  const data = await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.SERVER_ID
    ),
    { body: commands }
  )

  if (Array.isArray(data)) {
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    )
  } else {
    console.log(
      `Requested data returned is not an array: ${JSON.stringify(data)}`
    )
  }
} catch (error) {
  console.error(error)
}
