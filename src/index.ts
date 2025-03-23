import type { Command } from "./types"
import fs from "fs"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  MessageFlags,
} from "discord.js"
import express from "express"
import "dotenv/config"

const app = express()
const port = process.env.PORT || 3000

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
  ],
})

const commands = new Collection<string, Command>()
const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = path.join(__dirname, "commands")
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))
for (const file of commandFiles) {
  const command: { default: Command } = await import(`./commands/${file}`)
  console.log(`imported command file: ${file}`)
  if ("data" in command.default && "execute" in command.default) {
    console.log(`set command ${command.default.data.name}`)
    commands.set(command.default.data.name, command.default)
  } else {
    console.log(
      `[WARNING] The command at ${file} is missing a required "data" or "execute" property.`
    )
  }
}

app.use((request, result) => {
  result.send("im alive")
})

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = commands.get(interaction.commandName)

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (error) {
      console.error(error)
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        })
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        })
      }
    }
  })

  const eventsPath = path.join(__dirname, "events")
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"))

  for (const file of eventFiles) {
    const event = await import(`./events/${file}`)
    console.log(`imported event file: ${file}`)
    if (event.default.once) {
      client.once(event.default.name, (...args) =>
        event.default.execute(...args)
      )
    } else {
      client.on(event.default.name, (...args) => event.default.execute(...args))
    }
  }

  /*client.on("debug", (info) => {
    console.log(`Debug: ${info}`)
  })*/

  client.login(process.env.TOKEN)
})
