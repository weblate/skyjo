import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { type Game, KickVote } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import { BaseService } from "./base.service.js"

export class KickService extends BaseService {
  async onInitiateKickVote(socket: GameSocket, targetId: string) {
    const game = await this.getGame(socket.data.gameCode)
    await this.initiateKickVote(socket, game, targetId)
  }

  async onVoteToKick(socket: GameSocket, vote: boolean) {
    const game = await this.getGame(socket.data.gameCode)

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(
        `Player try to vote to kick but is not found. This can happen if the player left the game before the vote ended.`,
        {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const kickVote = await this.kickVoteRepository.getKickVote(game.code)
    if (!kickVote) {
      throw new CError(
        `No kick vote is in progress. This can happen if the vote has expired or if the game is not in the correct state.`,
        {
          code: ErrorConstants.ERROR.NO_KICK_VOTE_IN_PROGRESS,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const hasPlayerVoted = kickVote.hasPlayerVoted(player.id)
    if (hasPlayerVoted) {
      throw new CError(`Player has already voted.`, {
        code: ErrorConstants.ERROR.PLAYER_ALREADY_VOTED,
        level: "warn",
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    await this.kickVoteRepository.addVote(game.code, player.id, vote)

    await this.checkKickVoteStatus(game)
  }

  //#region private methods
  private async initiateKickVote(
    socket: GameSocket,
    game: Game,
    targetId: string,
  ) {
    const initiator = game.getPlayerById(socket.data.playerId)
    if (!initiator) {
      throw new CError(
        `Player try to initiate a kick vote but is not found. This can happen if the player left the game before the vote started.`,
        {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const target = game.getPlayerById(targetId)
    if (!target) {
      throw new CError(
        `Player try to initiate a kick vote but targeted player is not found. This can happen if the player left the game before the vote started.`,
        {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            initiatorId: initiator.id,
            targetId,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    if (game.isHost(initiator.id) && game.settings.private) {
      const operationManager = new GameStateTracker(game)

      this.socketManager.sendToRoom({
        room: game.code,
        event: "kick:host-kick",
        data: [target.id, target.name],
      })

      await game.disconnectPlayer(target)
      await this.updateAndSendGame(game, operationManager)
      return
    }

    const kickVoteAlreadyExists = await this.kickVoteRepository.getKickVote(
      game.code,
    )
    if (kickVoteAlreadyExists) {
      throw new CError(
        `Cannot initiate a kick vote, a kick vote is already in progress for this 
        game.`,
        {
          code: ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            initiatorId: initiator.id,
            targetId,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const kickVote = new KickVote({
      targetId: target.id,
      initiatorId: initiator.id,
      nbConnectedPlayers: game.getConnectedPlayers().length,
    })

    try {
      await this.kickVoteRepository.createKickVote(game.code, kickVote)

      await this.kickVoteExpirationQueue.addKickVoteExpiration(
        game.code,
        target.id,
      )

      await this.checkKickVoteStatus(game)
    } catch (error) {
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS
      ) {
        throw new CError(
          `Cannot initiate a kick vote, a kick vote is already in progress for this game.`,
          {
            code: ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS,
            level: "warn",
            meta: {
              game: game.serialize(),
              socketId: socket.id,
              initiatorId: initiator.id,
              targetId,
              gameCode: game.code,
              playerId: socket.data.playerId,
            },
          },
        )
      }
      throw error
    }
  }

  private async checkKickVoteStatus(game: Game) {
    const kickVote = await this.kickVoteRepository.getKickVote(game.code)
    if (!kickVote) {
      Logger.debug(
        `No kick vote found for game ${game.code} during status check`,
        {
          gameCode: game.code,
        },
      )
      return
    }

    const playerToKick = game.getPlayerById(kickVote.targetId)
    if (!playerToKick) {
      this.socketManager.sendToRoom({
        room: game.code,
        event: "kick:vote-dismiss",
        data: [],
      })
      await this.kickVoteExpirationQueue.cancelKickVoteExpiration(game.code)
      await this.kickVoteRepository.deleteKickVote(game.code)
      return
    }

    if (
      kickVote.hasReachedRequiredVotes() ||
      kickVote.allPlayersVotedExceptTarget()
    ) {
      await this.kickVoteExpirationQueue.cancelKickVoteExpiration(game.code)
      await this.kickVoteRepository.deleteKickVote(game.code)

      if (kickVote.hasReachedRequiredVotes()) {
        await this.kickPlayer(game, kickVote)
      } else {
        this.socketManager.sendToRoom({
          room: game.code,
          event: "kick:vote-failed",
          data: [],
        })
      }
    } else {
      this.socketManager.sendToRoom({
        room: game.code,
        event: "kick:vote",
        data: [kickVote.toJson()],
      })
    }
  }

  private async kickPlayer(game: Game, kickVote: KickVote) {
    const playerToKick = game.getPlayerById(kickVote.targetId)
    if (!playerToKick) return

    const operationManager = new GameStateTracker(game)

    this.socketManager.sendToRoom({
      room: game.code,
      event: "kick:vote-success",
      data: [playerToKick.id],
    })

    await game.disconnectPlayer(playerToKick)

    await this.updateAndSendGame(game, operationManager)
  }
  //#endregion
}
