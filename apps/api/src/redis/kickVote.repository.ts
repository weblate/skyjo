import {
  KickVote,
  type KickVoteRedisDb,
  type KickVoteToJson,
} from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import { RedisClient } from "./client.js"

export class KickVoteRepository extends RedisClient {
  private static readonly KICK_VOTE_PREFIX = "game"
  private static readonly KICK_VOTE_SUFFIX = "kick-vote"
  private static readonly KICK_VOTE_TTL = 60 // 1 minute

  private getKickVoteKey(gameCode: string): string {
    return `${KickVoteRepository.KICK_VOTE_PREFIX}:${gameCode}:${KickVoteRepository.KICK_VOTE_SUFFIX}`
  }

  async getKickVote(gameCode: string): Promise<KickVote | null> {
    const client = await RedisClient.getClient()
    const key = this.getKickVoteKey(gameCode)

    try {
      const kickVote = (await client.json.get(key)) as KickVoteRedisDb | null
      return kickVote ? this.deserializeKickVote(kickVote) : null
    } catch (error) {
      Logger.debug(`Kick vote for game ${gameCode} not found in Redis`, {
        gameCode,
        error,
      })
      return null
    }
  }

  async createKickVote(gameCode: string, kickVote: KickVote) {
    const existingKickVote = await this.getKickVote(gameCode)
    if (existingKickVote) {
      throw new CError("A kick vote is already in progress for this game", {
        code: ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS,
        level: "warn",
        meta: {
          gameCode,
          targetId: kickVote.targetId,
          initiatorId: kickVote.initiatorId,
        },
      })
    }

    await this.setKickVote(gameCode, kickVote)
  }

  async updateKickVote(
    gameCode: string,
    kickVote: KickVoteToJson,
  ): Promise<KickVoteToJson> {
    const client = await RedisClient.getClient()
    const key = this.getKickVoteKey(gameCode)

    const existingKickVote = await this.getKickVote(gameCode)
    if (!existingKickVote) {
      throw new CError("No kick vote is in progress for this game", {
        code: ErrorConstants.ERROR.NO_KICK_VOTE_IN_PROGRESS,
        level: "warn",
        meta: {
          gameCode,
          targetId: kickVote.targetId,
          initiatorId: kickVote.initiatorId,
        },
      })
    }

    await client.json.set(key, "$", kickVote)
    await client.expire(key, KickVoteRepository.KICK_VOTE_TTL)

    Logger.debug(`Updated kick vote for game ${gameCode}`, {
      gameCode,
      targetId: kickVote.targetId,
      initiatorId: kickVote.initiatorId,
    })

    return kickVote
  }

  async addVote(gameCode: string, playerId: string, vote: boolean) {
    const existingKickVote = await this.getKickVote(gameCode)
    if (!existingKickVote) {
      throw new CError(
        "Player tried to add a vote to a non-existing kick vote",
        {
          code: ErrorConstants.ERROR.NO_KICK_VOTE_IN_PROGRESS,
          level: "warn",
          meta: {
            gameCode,
            playerId,
          },
        },
      )
    }

    const playerVoted = existingKickVote.hasPlayerVoted(playerId)
    if (playerVoted) {
      throw new CError("Player has already voted", {
        code: ErrorConstants.ERROR.PLAYER_ALREADY_VOTED,
        level: "warn",
        meta: {
          gameCode,
          playerId,
          targetId: existingKickVote.targetId,
        },
      })
    }

    existingKickVote.addVote(playerId, vote)

    await this.setKickVote(gameCode, existingKickVote)

    Logger.debug(
      `Added vote for player ${playerId} to kick vote for game ${gameCode}`,
      {
        gameCode,
        playerId,
        vote,
        targetId: existingKickVote.targetId,
      },
    )

    return existingKickVote
  }

  async deleteKickVote(gameCode: string): Promise<void> {
    const client = await RedisClient.getClient()
    const key = this.getKickVoteKey(gameCode)

    await client.del(key)

    Logger.debug(`Deleted kick vote for game ${gameCode}`, { gameCode })
  }

  //#region
  private deserializeKickVote(kickVoteDb: KickVoteRedisDb): KickVote {
    return new KickVote(kickVoteDb)
  }

  private async setKickVote(gameCode: string, kickVote: KickVote) {
    const client = await RedisClient.getClient()

    const key = this.getKickVoteKey(gameCode)
    const json = kickVote.serialize()

    await client.json.set(key, "$", json)

    const ttl = KickVoteRepository.KICK_VOTE_TTL

    await client.expire(key, ttl)
  }
}
