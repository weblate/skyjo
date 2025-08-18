// Penalty types enum
export const penaltyTypes = ["leavebuster", "chat_restrict", "tempban", "ban"] as const
export type PenaltyType = (typeof penaltyTypes)[number]

// Penalty data interface
export interface PenaltyData {
  id: number
  userId?: number
  guestId?: string
  reportId?: number
  type: PenaltyType
  level?: number // Only for leavebuster (1-5)
  reason: string
  // For counter-based leavebuster
  completionsRequired?: number
  completionsDone?: number
  // For time-based penalties (chat_restrict, tempban)
  expiresAt?: string
  createdAt: string
  // Added by API for frontend
  displayDuration?: number
}

// Leavebuster configuration
export const LEAVEBUSTER_CONFIG = {
  1: { completions: 1, duration: 10 }, // 1 time, 10 seconds
  2: { completions: 5, duration: 30 }, // 5 times, 30 seconds each
  3: { completions: 5, duration: 60 }, // 5 times, 1 minute each
  4: { completions: 5, duration: 180 }, // 5 times, 3 minutes each
  5: { completions: 5, duration: 300 }, // 5 times, 5 minutes each
} as const

export type LeavebusterLevel = keyof typeof LEAVEBUSTER_CONFIG

// API Response types
export interface PenaltiesResponse {
  penalties: PenaltyData[]
}

export interface CanPlayResponse {
  canPlay: boolean
  blockingPenalty?: {
    type: "leavebuster"
    level: number
    completionsRemaining: number
    displayDuration: number
  }
}

export interface CanChatResponse {
  canChat: boolean
}

export interface CompleteLeavebusterResponse {
  completed: number
  remaining: number
  isFinished: boolean
}