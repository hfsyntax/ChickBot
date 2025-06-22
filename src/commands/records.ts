import type { SpeedrunRecords, SpeedrunRecordsRun } from "../types"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import fetch from "node-fetch"
import limiter from "../utilities/limiter"

function getData(arg: string) {
  const obj = {
    mobile: "21gxrvxq",
    pc: "jqz07841",
    "25hops": "z2739god",
    "50hops": "w20pel5k",
    "100hops": "wdmzmeo2",
    "200hops": "n2yjm372",
    "500hops": "7kjz7q3d",
    "1000hops": "wkpjzywk",
    "highscore-original": "zdnr7wx2",
    "highscore-pacman": "zdnr7wx2",
    "highscore-penguin": "zdnr7wx2",
    "highscore-bashybeaver": "zdnr7wx2",
  }
  return arg in obj ? obj[arg as keyof typeof obj] : undefined
}

const records = {
  data: new SlashCommandBuilder()
    .setName("records")
    .setDescription("Retrieves the Speedrun all time records for a category.")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("The category to query.")
        .setRequired(true)
        .addChoices(
          { name: "25hops", value: "25hops" },
          { name: "50hops", value: "50hops" },
          { name: "100hops", value: "100hops" },
          { name: "200hops", value: "200hops" },
          { name: "500hops", value: "500hops" },
          { name: "1000hops", value: "1000hops" },
          { name: "highscore-original", value: "highscore-original" },
          { name: "highscore-pacman", value: "highscore-pacman" },
          { name: "highscore-penguin", value: "highscore-penguin" },
          { name: "highscore-bashybeaver", value: "highscore-bashybeaver" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("The platform to query.")
        .setRequired(true)
        .addChoices(
          { name: "mobile", value: "mobile" },
          { name: "pc", value: "pc" }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild() || !interaction.channel?.isSendable())
      return
    const category = interaction.options.get("category")?.value as string
    const platform = interaction.options.get("platform")?.value as string
    await limiter.schedule(() =>
      interaction.reply({
        content: `Fetching records for ${category} ${platform}, please be patient.`,
        flags: "Ephemeral",
      })
    )

    let categoryID = getData(category?.toLowerCase())
    let continueLooping = true
    let start = 0
    let end = 200
    let apiData = new Array<SpeedrunRecordsRun>()

    while (continueLooping) {
      let baseURL = `https://www.speedrun.com/api/v1/runs?game=j1n29w1p&category=${categoryID}&embed=players&status=verified`
      let page = await fetch(`${baseURL}&offset=${start}&max=${end}`)
      let response = (await page.json()) as SpeedrunRecords
      apiData = apiData.concat(response.data)
      start = end + 1
      end = end + 200 + 1
      if (response.pagination.size < 1) continueLooping = false
    }

    // filter by category and platform
    apiData = apiData.filter((i) => {
      if (Object.keys(i.values).length > 1) {
        let key = null

        if (category?.includes("original")) {
          key = "21goo2oq"
        } else if (category?.includes("pacman")) {
          key = "jqzyyxkl"
        } else if (category?.includes("penguin")) {
          key = "klr66ywl"
        } else {
          key = "rqvzg561"
        }
        return (
          i.status.status !== "rejected" &&
          i.values.ylpm3yrl === key &&
          i.values.wl36g46l === getData(platform)
        )
      } else {
        return (
          i.status.status !== "rejected" &&
          i.values.wl36g46l === getData(platform)
        )
      }
    })

    if (apiData.length <= 0) {
      return await limiter.schedule(() =>
        interaction.followUp({
          content: `<@${interaction.user.id}> no data found for ${category} ${platform}`,
          flags: "Ephemeral",
        })
      )
    }

    // format highscores correctly and sort
    if (category.includes("highscore")) {
      apiData = apiData.map((i) => {
        i.times.primary_t = Math.floor(i.times.primary_t * 1000)
        return i
      })
    }

    apiData = apiData.sort((i, j) => (i.submitted > j.submitted ? 1 : -1))

    let record = apiData[0]
    let content = ""
    let scores = []

    for (let i = 0; i < apiData.length; i++) {
      if (category.includes("highscore")) {
        if (apiData[i].times.primary_t >= record.times.primary_t) {
          record = apiData[i]
          scores.push(record)
        }
      } else {
        if (apiData[i].times.primary_t <= record.times.primary_t) {
          record = apiData[i]
          scores.push(record)
        }
      }
    }

    scores = scores.sort((a, b) => (a.submitted < b.submitted ? 1 : -1))

    for (let i = 0; i < scores.length; i++) {
      if (scores[i].players.data[0]?.names?.international)
        content += `${scores[i].players.data[0].names?.international} ${
          scores[i].times.primary_t
        } | ${scores[i].submitted.substr(0, 10)}\n`
    }

    const embed = new EmbedBuilder()
      .setTitle(
        `Crossy Road ${[category, platform]
          .join(" ")
          .replace("-", " ")} Records`.replace(
          /(^\w{1})|(\s{1}\w{1})/g,
          (match) => match.toUpperCase()
        )
      )
      .setDescription(content)
      .setColor("Green")
      .setThumbnail(
        "https://www.speedrun.com/static/game/j1n29w1p/cover.png?v=a0d1a35"
      )
      .setFooter({ text: `Retrieved from speedrun.com/crossy` })
      .setTimestamp()

    await limiter.schedule(() =>
      interaction.followUp({ embeds: [embed], flags: "Ephemeral" })
    )
  },
}

export default records
