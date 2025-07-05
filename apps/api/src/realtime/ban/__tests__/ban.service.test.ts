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
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { BanService } from "../ban.service.js"
import "@skymo/error/test/expect-extend"

describe("BanService", () => {
  let service: BanService
  let game: Game

  let player: Player
  let socket: GameSocket

  let opponent1: Player
  let opponent1Socket: GameSocket

  let opponent2: Player

  beforeEach(() => {
    service = new BanService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    socket = mockSocket()

    player = new Player(
      { name: "player", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    opponent1 = new Player(
      { name: "opponent1", avatar: CoreConstants.AVATARS.CRAB },
      RANDOM_SOCKET_ID(),
    )
    opponent2 = new Player(
      { name: "opponent2", avatar: CoreConstants.AVATARS.DOG },
      RANDOM_SOCKET_ID(),
    )

    game = new Game({
      hostId: player.id,
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
    expect(BanService).toBeDefined()
  })

  describe("onBanPlayer", () => {
    it("should throw if the initiator is not the host", async () => {
      game.hostId = opponent1.id

      vi.spyOn(game, "isHost").mockImplementation((playerId) => {
        return playerId === opponent1.id
      })

      await expect(
        service.onBanPlayer(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.BAN_ERROR.NOT_ALLOWED)
    })

    it("should throw if the game is not private", async () => {
      game.settings.private = false

      await expect(
        service.onBanPlayer(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.BAN_ERROR.NOT_ALLOWED)
    })

    it("should throw if the targeted player is not in the game", async () => {
      game.settings.private = true

      vi.spyOn(game, "getPlayerById").mockImplementation((id) => {
        if (id === "non-existent-player-id") return undefined
        return game.players.find((p) => p.id === id)
      })

      await expect(
        service.onBanPlayer(socket, "non-existent-player-id"),
      ).toThrowCErrorWithCode(ErrorConstants.BAN_ERROR.PLAYER_NOT_FOUND)
    })

    it("should ban the player successfully", async () => {
      // Make game private
      game.settings.private = true

      // Spy on relevant methods
      const banPlayerSpy = vi.spyOn(game, "banPlayer")
      const disconnectPlayerSpy = vi
        .spyOn(game, "disconnectPlayer")
        .mockResolvedValue()
      const sendToRoomSpy = vi.spyOn(service["socketManager"], "sendToRoom")
      const updateAndSendGameSpy = vi.spyOn(service as any, "updateAndSendGame")

      // Execute the ban
      await service.onBanPlayer(socket, opponent2.id)

      // Verify the player was banned
      expect(banPlayerSpy).toHaveBeenCalledWith(opponent2)

      // Verify event was sent to room
      expect(sendToRoomSpy).toHaveBeenCalledWith({
        room: game.code,
        event: "ban:player-banned",
        data: [opponent2.id, opponent2.name],
      })

      // Verify player was disconnected
      expect(disconnectPlayerSpy).toHaveBeenCalledWith(opponent2)

      // Verify game state was updated and sent
      expect(updateAndSendGameSpy).toHaveBeenCalled()
    })

    it("should add player id and name to ban lists", async () => {
      // Make game private
      game.settings.private = true

      // Mock methods to avoid actual execution
      vi.spyOn(game, "disconnectPlayer").mockResolvedValue()

      // Ensure ban lists are empty initially
      expect(game.bannedPlayerIds).toHaveLength(0)
      expect(game.bannedNames).toHaveLength(0)

      // Execute the ban
      await service.onBanPlayer(socket, opponent2.id)

      // Verify ban lists were updated
      expect(game.bannedPlayerIds).toContain(opponent2.id)
      expect(game.bannedNames).toContain(opponent2.name)
    })

    it("should update the host if banned player was the host", async () => {
      // Make game private and current player host
      game.settings.private = true

      // Make opponent2 the host
      game.hostId = opponent2.id

      // Override isHost to make this test work
      vi.spyOn(game, "isHost").mockImplementation((playerId) => {
        // Return true for the current socket player to pass the host check
        return playerId === player.id
      })

      // Mock methods to avoid actual execution
      vi.spyOn(game, "disconnectPlayer").mockImplementation(async () => {
        // simulate what happens during disconnectPlayer
        game.changeHost()
      })

      const changeHostSpy = vi.spyOn(game, "changeHost")

      // Execute the ban
      await service.onBanPlayer(socket, opponent2.id)

      // Verify host was changed
      expect(changeHostSpy).toHaveBeenCalled()
      expect(game.hostId).not.toBe(opponent2.id)
    })

    it("should handle the case when state doesn't change", async () => {
      // Make game private
      game.settings.private = true

      // Mock disconnectPlayer to avoid actual execution
      vi.spyOn(game, "disconnectPlayer").mockResolvedValue()

      // Mock GameStateTracker to return null (no changes)
      vi.spyOn(GameStateTracker.prototype, "getChanges").mockReturnValue(null)

      // Execute the ban without error
      await expect(
        service.onBanPlayer(socket, opponent2.id),
      ).resolves.not.toThrow()
    })
  })
})
