import type { Avatar, ConnectionStatus, SettingsRedisDb } from "@skymo/core"

export interface UserProfile {
  username: string
  name: string
  avatar: Avatar
}

export interface UserGameStats {
  totalGames: {
    public: number
    private: number
    total: number
  }

  wins: {
    public: number
    private: number
    total: number
  }

  winRate: {
    public: number
    private: number
    total: number
  }
  averageRank: {
    public: number
    private: number
    total: number
  }
}

export interface UserRecentActivity {
  id: string
  code: string
  rank: number
  settings: SettingsRedisDb
  hostName: string
  isPrivate: boolean
  players: {
    name: string
    username: string | null
    avatar: Avatar
    rank: number
    forfeited: boolean
    forfeitedAt: number | null
    connectionStatus: ConnectionStatus
  }[]
  createdAt: string
  finishedAt: string
}

export interface UserProfileResponse {
  user: UserProfile
  games: UserRecentActivity[]
  stats: UserGameStats
}
