import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"

export interface Command {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export type Player = {
  elo: number
  games: number
  won: number
}

export type PlayerData = {
  id?: string
  name?: string
  elo?: number
  rank?: number
  games?: number
  won?: number
}

export type ChallengeMessage = {
  created: number | undefined
  challenger_id: string | undefined
  opponent_id: string | undefined
}

export type RunMessage = {
  created: number | undefined
  actions: number | undefined
  run_attempts: number | undefined
  user_id: string | undefined
}

interface SpeedrunRankingsRun {
  place: number
  run: {
    id: string
    weblink: string
    game: string
    level: null
    category: string
    videos: {
      links: [
        {
          uri: string
        }
      ]
    }
    comment: string | null
    status: {
      status: string
      examiner: string
      "verify-date": string
    }
    players: [
      {
        rel: string
        id: string
        uri: string
      }
    ]
    date: string
    submitted: string
    times: {
      primary: string
      primary_t: number
      realtime: string
      realtime_t: number
      realtime_noloads: null
      realtime_noloads_t: number
      ingame: null
      ingame_t: number
    }
    system: {
      platform: string
      emulated: boolean
      region: null
    }
    splits: null
    values: {
      wl36g46l: string
    }
  }
}

interface SpeedrunRankings {
  data: {
    weblink: string
    game: string
    category: string
    level: null
    platform: null
    region: null
    emulators: null
    "video-only": boolean
    timing: string
    values: {
      [key: string]: string
    }
    runs: SpeedrunRankingsRun[]
    players: {
      data: {
        names?: {
          international: string
        }
      }[]
    }
  }
  status?: number
}

interface SpeedrunRecordsRun {
  status: {
    status: string
    examiner: string
    "verify-date": string
  }
  players: {
    data: {
      names?: {
        international: string
      }
    }[]
  }
  submitted: string
  times: {
    primary_t: number
  }
  values: {
    [key: string]: string
  }
}

interface SpeedrunRecords {
  data: SpeedrunRecordsRun[]
  pagination: {
    size: number
  }
}
