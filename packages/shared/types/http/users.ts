import type { Avatar } from "@skymo/core"

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
  finishedAt: string
}

export interface UserProfileResponse {
  user: UserProfile
  games: UserRecentActivity[]
  stats: UserGameStats
}
