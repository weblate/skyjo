import type { Avatar, SettingsRedisDb } from "@skymo/core"

export interface UserProfile {
  username: string
  name: string
  avatar: Avatar
}

export interface UserGameStats {
  totalGames: number
  wins: number
  winRate: number
  averageRank: number
}

export interface UserRecentActivity {
  id: string
  code: string
  rank: number
  settings: SettingsRedisDb
  hostName: string
  players: {
    name: string
    username: string | null
    avatar: Avatar
    rank: number
  }[]
  createdAt: string
  finishedAt: string
}

export interface UserProfileResponse {
  user: UserProfile
  games: UserRecentActivity[]
  stats: UserGameStats
}
