import { Constants as CoreConstants, type Game } from "@skymo/core"
import { Logger } from "@skymo/logger"
import type { Job } from "bullmq"
import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { GameRepository } from "@/redis/game.repository.js"
import { KickVoteRepository } from "@/redis/kickVote.repository.js"
import { BaseQueueService } from "./BaseQueueService.js"

export interface KickVoteExpirationJobData {
  gameCode: string
  targetId: string
}

export class KickVoteExpirationQueueService extends BaseQueueService<KickVoteExpirationJobData> {
  private static instance: KickVoteExpirationQueueService | null = null
  private readonly kickVoteRepository = new KickVoteRepository()
  private readonly gameRepository = new GameRepository()
  private readonly socketManager = SocketManager.getInstance()

  private constructor() {
    super("kick-vote-expiration", {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    })
  }

  static getInstance(): KickVoteExpirationQueueService {
    KickVoteExpirationQueueService.instance ??=
      new KickVoteExpirationQueueService()

    return KickVoteExpirationQueueService.instance
  }

  static exists(): boolean {
    return !!KickVoteExpirationQueueService.instance
  }

  async addKickVoteExpiration(
    gameCode: string,
    targetId: string,
  ): Promise<void> {
    const delay = CoreConstants.KICK_VOTE_EXPIRATION_TIME

    await this.queue.add(
      `kick-vote-expiration-${gameCode}`,
      { gameCode, targetId },
      { delay, jobId: `kick-vote-expiration-${gameCode}` },
    )

    Logger.debug(`Added kick vote expiration job for game ${gameCode}`, {
      gameCode,
      targetId,
      delay,
    })
  }

  async cancelKickVoteExpiration(gameCode: string): Promise<void> {
    const jobId = `kick-vote-expiration-${gameCode}`
    await this.queue.remove(jobId)

    Logger.debug(`Cancelled kick vote expiration job for game ${gameCode}`, {
      gameCode,
      jobId,
    })
  }

  protected async processJob(
    job: Job<KickVoteExpirationJobData>,
  ): Promise<void> {
    const { gameCode, targetId } = job.data

    Logger.info(`Processing kick vote expiration for game ${gameCode}`, {
      gameCode,
    })

    const kickVote = await this.kickVoteRepository.getKickVote(gameCode)

    if (!kickVote) {
      Logger.info(`No kick vote found for game ${gameCode}`, {
        gameCode,
      })
      return
    }

    const game = await this.getGame(gameCode)

    const playerToKick = game.getPlayerById(targetId)

    if (playerToKick) {
      this.socketManager.sendToRoom({
        room: gameCode,
        event: "kick:vote-failed",
        data: [],
      })

      Logger.info(
        `Kick vote expired for player ${playerToKick.name} in game ${gameCode}`,
        {
          gameCode,
          targetId,
          playerName: playerToKick.name,
        },
      )
    }

    // Delete the kick vote
    await this.kickVoteRepository.deleteKickVote(gameCode)
  }

  private async getGame(gameCode: string): Promise<Game> {
    const game = await this.gameRepository.getGame(gameCode)
    game.setOperationManager(GameOperationManager.getInstance())
    return game
  }
}
