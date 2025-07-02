import type { Game, PlayerToJson, PublicGameTag } from "@skymo/core"

export interface PublicGame extends Pick<Game, "code"> {
  hostName: string
  maxPlayers: number
  players: Pick<PlayerToJson, "name" | "avatar" | "id">[]
  tags: PublicGameTag[]
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar: string
  wins: number
  totalGames: number
  winRate: number
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  lastUpdated: string
}
