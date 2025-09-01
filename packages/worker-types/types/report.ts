import type { ConnectionStatus } from "@skymo/core"
import type { reportReasonEnum } from "@skymo/database/schema"

export type ReportJobGameContextPlayer = {
  id: string
  name: string
  username?: string
  connectionStatus: ConnectionStatus
}

export type ReportJobGameContextMessage = {
  id: string
  message: string
  name?: string
  timestamp: string
}

export type ReportReason = (typeof reportReasonEnum.enumValues)[number]

export type ReportJobData = {
  reportId: number
  reporterId: string
  reporterName: string
  reportedPlayerId: string
  reportedPlayerName: string
  reason: ReportReason
  gameCode: string
  reportedAt: string
  targetUserId?: number
  targetGuestId?: string
  comment?: string
  isPrivateGame: boolean
  gameContext: {
    players: ReportJobGameContextPlayer[]
    messages: ReportJobGameContextMessage[]
  }
}
