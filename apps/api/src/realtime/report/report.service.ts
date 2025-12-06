import { Game } from "@skymo/core"
import { reportTable } from "@skymo/database/schema"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { type Report } from "@skymo/shared/validations"
import type { ReportJobData } from "@skymo/worker-types"
import { db } from "@/db/index.js"
import { DiscordQueueService } from "@/queues/DiscordQueueService.js"
import { BaseService } from "@/realtime/base/base.service.js"
import type { AuthenticatedGameSocket } from "@/realtime/types/gameSocket.js"
import { trackAnalyticsPlayerReported } from "@/services/analytics/game.analytics.js"

export class ReportService extends BaseService {
  private readonly discordQueue = DiscordQueueService.getInstance()

  async onReport(socket: AuthenticatedGameSocket, report: Report) {
    const game = await this.getGame(socket.data.gameCode)

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player try to report but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    const target = game.getPlayerById(report.targetId)
    if (!target) {
      throw new CError(`Target player not found when reporting.`, {
        level: "warn",
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
          targetId: report.targetId,
        },
      })
    }

    // Capture full game context
    const gameContext = await this.captureGameContext(game)

    const [{ id: reportId }] = await db
      .insert(reportTable)
      .values({
        userId: target.userId ?? null,
        guestId: target.guestId ?? null,
        reason: report.reason,
        comment: report.comment,
        reportData: {
          reporterId: player.id,
          reporterName: player.name,
          reportedPlayerId: target.id,
          reportedPlayerName: target.name,
          gameCode: game.code,
          gameContext,
        },
      })
      .returning({ id: reportTable.id })

    await this.sendToDiscord({
      reportId,
      reporterId: player.id,
      reporterName: player.name,
      reportedPlayerId: target.id,
      reportedPlayerName: target.name,
      reason: report.reason,
      gameCode: game.code,
      reportedAt: new Date().toISOString(),
      targetUserId: target.userId,
      targetGuestId: target.guestId,
      comment: report.comment,
      isPrivateGame: game.settings.private,
      gameContext,
    })

    await trackAnalyticsPlayerReported(player, target, report.reason)
  }

  private async captureGameContext(game: Game) {
    // Get all messages from the game
    const messages = await this.messageRepository.getAllMessages(game.code)

    // Get all players with their connection status
    const players = game.players.map((player) => ({
      id: player.id,
      name: player.name,
      username: player.userId ? `User ${player.userId}` : undefined, // We don't have username in player object, using userId as placeholder
      connectionStatus: player.connectionStatus,
    }))

    return {
      players,
      messages: messages.map((message) => ({
        id: message.id,
        message: message.message,
        name: "name" in message ? message.name : undefined,
        timestamp: new Date().toISOString(), // ChatMessage doesn't have timestamp, using current time as fallback
      })),
    }
  }

  private async sendToDiscord(reportData: ReportJobData) {
    try {
      await this.discordQueue.sendReportNotification(reportData)
    } catch (error) {
      console.error("Failed to send Discord notification:", error)
      // Don't throw - this shouldn't break the report flow
    }
  }
}
