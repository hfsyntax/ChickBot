import type { SpeedrunRankings } from "../types"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import fetch from "node-fetch"

function getData(arg: string) {
  const obj = {
    "25hops mobile": "z2739god?embed=players&var-wl36g46l=21gxrvxq",
    "25hops pc": "z2739god?embed=players&platform=8gej2n93",
    "50hops mobile": "w20pel5k?embed=players&var-wl36g46l=21gxrvxq",
    "50hops pc": "w20pel5k?embed=players&platform=8gej2n93",
    "100hops mobile": "wdmzmeo2?embed=players&var-wl36g46l=21gxrvxq",
    "100hops pc": "wdmzmeo2?embed=players&platform=8gej2n93",
    "200hops mobile": "n2yjm372?embed=players&var-wl36g46l=21gxrvxq",
    "200hops pc": "n2yjm372?embed=players&platform=8gej2n93",
    "500hops mobile": "7kjz7q3d?embed=players&var-wl36g46l=21gxrvxq",
    "500hops pc": "7kjz7q3d?embed=players&platform=8gej2n93",
    "1000hops mobile": "wkpjzywk?embed=players&var-wl36g46l=21gxrvxq",
    "1000hops pc": "wkpjzywk?embed=players&platform=8gej2n93",
    "highscore-original mobile":
      "zdnr7wx2?var-ylpm3yrl=21goo2oq&embed=players&var-wl36g46l=21gxrvxq",
    "highscore-original pc":
      "zdnr7wx2?var-ylpm3yrl=21goo2oq&embed=players&platform=8gej2n93",
    "highscore-pacman mobile":
      "zdnr7wx2?var-ylpm3yrl=jqzyyxkl&embed=players&var-wl36g46l=21gxrvxq",
    "highscore-pacman pc":
      "zdnr7wx2?var-ylpm3yrl=jqzyyxkl&embed=players&platform=8gej2n93",
    "highscore-penguin mobile": "zdnr7wx2?var-ylpm3yrl=klr66ywl&embed=players",
    "highscore-bashybeaver mobile":
      "zdnr7wx2?var-ylpm3yrl=rqvzg561&embed=players",
  }
  return arg in obj ? obj[arg as keyof typeof obj] : undefined
}

const rankings = {
  data: new SlashCommandBuilder()
    .setName("rankings")
    .setDescription("Displays the top 10 Speedrun players for a category.")
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
    await interaction.reply({
      content: `Fetching top 5 speedrun players for ${category} ${platform}, please be patient.`,
      flags: "Ephemeral",
    })
    const response = await fetch(
      `https://www.speedrun.com/api/v1/leaderboards/j1n29w1p/category/${getData(
        [category, platform].join(" ")
      )}`
    )
    const apiData = (await response.json()) as SpeedrunRankings

    if (
      apiData.status === 404 ||
      !apiData.data ||
      apiData.data.runs.length < 5
    ) {
      return await interaction.followUp({
        content: "The category doesn't exist or is there is not enough data.",
      })
    }

    let content = ""
    for (let run = 0; run < 5; run++) {
      const rank = apiData.data.runs[run].place
      const user = apiData.data.players.data[run].names?.international
      let score = apiData.data.runs[run].run.times.primary_t
      // format highscores correctly
      if (category?.includes("highscore")) score = Math.floor(score * 1000)
      if (user) content += `${rank}. ${user} ${score}\n`
    }
    const embed = new EmbedBuilder()
      .setTitle(
        `Crossy Road ${[category, platform]
          .join(" ")
          .replace("-", " ")} Rankings`.replace(
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
    await interaction.followUp({ embeds: [embed], flags: "Ephemeral" })
  },
}

export default rankings
