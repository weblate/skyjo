import type { Game, GameStatus, PlayerToJson, PublicGameTag } from "@skymo/core"

export interface PublicGame extends Pick<Game, "code"> {
  hostName: string
  maxPlayers: number
  players: Pick<PlayerToJson, "name" | "avatar" | "id">[]
  tags: PublicGameTag[]
}

export interface GameStatusResponse {
  gameCode: string
  status: GameStatus
  connectedPlayersCount: number
  isPrivate: boolean
  playerForfeited?: boolean
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
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
