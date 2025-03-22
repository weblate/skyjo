import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { Constants as CoreConstants, Game, Player, Settings } from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import {
  mockGameOperationManager,
  mockGameStateTracker,
  mockRedisInService,
  mockSocket,
  mockSocketManagerInService,
} from "@tests/_mock.js"
import { RANDOM_SOCKET_ID, TEST_SOCKET_ID } from "@tests/constants-test.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { KickService } from "../kick.service.js"

describe("KickService", () => {
  let service: KickService
  let game: Game

  let player: Player
  let socket: GameSocket

  let opponent1: Player
  let opponent1Socket: GameSocket

  let opponent2: Player

  beforeEach(() => {
    service = new KickService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    socket = mockSocket()

    player = new Player(
      { username: "player", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    opponent1 = new Player(
      { username: "opponent1", avatar: CoreConstants.AVATARS.CRAB },
      RANDOM_SOCKET_ID(),
    )
    opponent2 = new Player(
      { username: "opponent2", avatar: CoreConstants.AVATARS.DOG },
      RANDOM_SOCKET_ID(),
    )

    game = new Game({
      hostId: player.socketId,
      settings: new Settings(),
    })
    mockGameStateTracker(game)
    mockGameOperationManager(game)
    game.addPlayer(player)
    game.addPlayer(opponent1)
    opponent1Socket = mockSocket(opponent1.socketId)
    game.addPlayer(opponent2)

    service["redis"].getGame = vi.fn(() => Promise.resolve(game))

    socket.data = {
      gameCode: game.code,
      playerId: player.id,
    }

    opponent1Socket.data = {
      gameCode: game.code,
      playerId: opponent1.id,
    }
  })

  it("should be defined", () => {
    expect(KickService).toBeDefined()
  })

  describe("initiateKickVote", () => {
    it("should throw if the initiator is not in the game", async () => {
      socket.data.playerId = "NOT-A-PLAYER-ID"

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)
    })

    it("should throw if the targeted player is not in the game", async () => {
      await expect(
        service.onInitiateKickVote(socket, crypto.randomUUID()),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)
    })

    it("should directly kick the player if the initiator is the host and the game is private", async () => {
      game.settings.private = true
      game.hostId = player.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(service["kickVotes"].get(game.id)).toBeUndefined()

      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:host-kick",
        data: [opponent2.id, opponent2.name],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeUndefined()
    })

    it("should initiate a kick vote if the initiator is the host but the game is public", async () => {
      game.settings.private = false
      game.hostId = player.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(service["kickVotes"].get(game.id)).toBeDefined()
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote",
        data: [expect.any(Object)],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeDefined()
    })

    it("should initiate a kick vote if the game is private but the initiator is not the host", async () => {
      game.settings.private = true
      game.hostId = opponent1.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(service["kickVotes"].get(game.id)).toBeDefined()
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote",
        data: [expect.any(Object)],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeDefined()
    })

    it("should initiate a kick vote", async () => {
      await service.onInitiateKickVote(socket, opponent2.id)

      expect(service["kickVotes"].get(game.id)).toBeDefined()
    })

    it("should throw if a kick vote already exists for the game", async () => {
      await service.onInitiateKickVote(socket, opponent2.id)

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS)
    })

    it("should check vote status if the kick vote has expired", async () => {
      vi.useFakeTimers()

      await service.onInitiateKickVote(socket, opponent2.id)

      // add 31 seconds
      vi.advanceTimersByTime(31000)

      // expect(service["kickVotes"].get(game.id)).toBeUndefined()

      vi.useRealTimers()
    })
  })

  describe("onVoteToKick", () => {
    it("should throw if the player is not found", async () => {
      socket.data.playerId = "NOT-A-PLAYER-ID"

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should throw if no kick vote is in progress", async () => {
      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NO_KICK_VOTE_IN_PROGRESS,
      )
    })

    it("should throw if the player has already voted", async () => {
      await service.onInitiateKickVote(socket, opponent2.id)

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_ALREADY_VOTED,
      )
      expect(service["kickVotes"].get(game.id)?.["votes"].length).toBe(1)
    })

    it("should add a vote to the kick vote and broadcast the vote", async () => {
      await service.onInitiateKickVote(opponent1Socket, opponent2.id)
      const kickVote = service["kickVotes"].get(game.id)
      const oldKickVoteJson = structuredClone(kickVote?.toJson())

      const opponent3 = new Player(
        { username: "opponent3", avatar: CoreConstants.AVATARS.DOG },
        RANDOM_SOCKET_ID(),
      )
      game.addPlayer(opponent3)

      const opponent4 = new Player(
        { username: "opponent4", avatar: CoreConstants.AVATARS.JELLYFISH },
        RANDOM_SOCKET_ID(),
      )
      game.addPlayer(opponent4)

      expect(kickVote?.["votes"].length).toBe(1)
      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: game.code,
        event: "kick:vote",
        data: [oldKickVoteJson],
      })

      await service.onVoteToKick(socket, true)

      expect(service["socketManager"].sendToRoom).toHaveBeenCalledTimes(2)

      expect(kickVote?.["votes"].length).toBe(2)
      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: game.code,
        event: "kick:vote",
        data: [kickVote?.toJson()],
      })
    })

    it("should add a vote to the kick vote, try to kick the player but throw because player is not in the game", async () => {
      await service.onInitiateKickVote(opponent1Socket, opponent2.id)

      game.players = game.players.filter((p) => p.id !== opponent2.id)

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    for (const key of Object.keys(CoreConstants.GAME_STATUS)) {
      it(`should add a vote to the kick vote and broadcast the success and change the host if target is the current host in ${key}`, async () => {
        game.status =
          CoreConstants.GAME_STATUS[
            key as keyof typeof CoreConstants.GAME_STATUS
          ]
        game.hostId = opponent2.id
        await service.onInitiateKickVote(socket, opponent2.id)
        await service.onVoteToKick(opponent1Socket, true)

        expect(game.hostId).not.toBe(opponent2.id)
      })
    }

    it("should add a vote to the kick vote, broadcast the success and remove the player if game is not playing", async () => {
      game.status = CoreConstants.GAME_STATUS.FINISHED
      await service.onInitiateKickVote(opponent1Socket, opponent2.id)

      await service.onVoteToKick(socket, true)

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: game.code,
        event: "kick:vote",
        data: expect.arrayContaining([]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: game.code,
        event: "kick:vote-success",
        data: [opponent2.id, opponent2.name],
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(3, {
        room: game.code,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            removePlayers: [opponent2.id],
          }),
        ]),
      })

      expect(service["kickVotes"].get(game.id)).toBeUndefined()
      expect(game.players.find((p) => p.id === opponent2.id)).toBeUndefined()
    })

    it("should add a vote to the kick vote, broadcast the success and set the player connection status to disconnected if game is in progress", async () => {
      game.status = CoreConstants.GAME_STATUS.PLAYING

      await service.onInitiateKickVote(opponent1Socket, opponent2.id)

      await service.onVoteToKick(socket, true)

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: game.code,
        event: "kick:vote",
        data: expect.arrayContaining([]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: game.code,
        event: "kick:vote-success",
        data: [opponent2.id, opponent2.name],
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(3, {
        room: game.code,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            updatePlayers: [
              {
                connectionStatus: CoreConstants.CONNECTION_STATUS.DISCONNECTED,
                id: opponent2.id,
              },
            ],
          }),
        ]),
      })

      expect(service["kickVotes"].get(game.id)).toBeUndefined()

      const kickedPlayer = game.players.find((p) => p.id === opponent2.id)
      expect(kickedPlayer).toBeDefined()
      expect(kickedPlayer?.connectionStatus).toBe(
        CoreConstants.CONNECTION_STATUS.DISCONNECTED,
      )
    })

    it("should add a vote to the kick vote and broadcast the failure", async () => {
      game.status = CoreConstants.GAME_STATUS.PLAYING

      await service.onInitiateKickVote(opponent1Socket, opponent2.id)

      await service.onVoteToKick(socket, false)

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: game.code,
        event: "kick:vote",
        data: expect.arrayContaining([]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: game.code,
        event: "kick:vote-failed",
        data: [opponent2.id, opponent2.name],
      })

      expect(service["kickVotes"].get(game.id)).toBeUndefined()

      const kickedPlayer = game.players.find((p) => p.id === opponent2.id)
      expect(kickedPlayer).toBeDefined()
      expect(kickedPlayer?.connectionStatus).toBe(
        CoreConstants.CONNECTION_STATUS.CONNECTED,
      )
    })
  })
})
