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
import type { AuthenticatedGameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { HostTransferService } from "../hostTransfer.service.js"
import "@skymo/error/test/expect-extend"

describe("HostTransferService", () => {
  let service: HostTransferService
  let game: Game

  let hostPlayer: Player
  let hostSocket: AuthenticatedGameSocket

  let targetPlayer: Player
  let targetSocket: AuthenticatedGameSocket

  let observer: Player

  beforeEach(() => {
    service = new HostTransferService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    hostSocket = mockSocket()
    targetSocket = mockSocket()

    hostPlayer = new Player(
      { name: "hostPlayer", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    targetPlayer = new Player(
      { name: "targetPlayer", avatar: CoreConstants.AVATARS.CRAB },
      RANDOM_SOCKET_ID(),
    )
    observer = new Player(
      { name: "observer", avatar: CoreConstants.AVATARS.DOG },
      RANDOM_SOCKET_ID(),
    )

    game = new Game({
      hostId: hostPlayer.id,
      settings: new Settings(),
    })
    mockGameStateTracker(game)
    mockGameOperationManager(game)
    game.addPlayer(hostPlayer)
    game.addPlayer(targetPlayer)
    game.addPlayer(observer)

    service["redis"].getGame = vi.fn(() => Promise.resolve(game))

    hostSocket.data = {
      gameCode: game.code,
      playerId: hostPlayer.id,
    }

    targetSocket.data = {
      gameCode: game.code,
      playerId: targetPlayer.id,
    }
  })

  it("should be defined", () => {
    expect(HostTransferService).toBeDefined()
  })

  describe("onTransferHost", () => {
    it("should throw if the initiator is not the host", async () => {
      // Transfer host role using non-host player socket
      await expect(
        service.onTransferHost(targetSocket, observer.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.NOT_ALLOWED)
    })

    it("should throw if the target player is not in the game", async () => {
      vi.spyOn(game, "getPlayerById").mockImplementation((id) => {
        if (id === "non-existent-player-id") return undefined
        return game.players.find((p) => p.id === id)
      })

      await expect(
        service.onTransferHost(hostSocket, "non-existent-player-id"),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)
    })

    it("should throw if the target player is not connected", async () => {
      // Set target player as disconnected
      targetPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST

      await expect(
        service.onTransferHost(hostSocket, targetPlayer.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_CONNECTED)
    })

    it("should transfer host role successfully", async () => {
      // Spy on relevant methods
      const sendToRoomSpy = vi.spyOn(service["socketManager"], "sendToRoom")
      const sendServerMessageSpy = vi.spyOn(service as any, "sendServerMessage")
      const updateAndSendGameSpy = vi.spyOn(service as any, "updateAndSendGame")

      // Execute the host transfer
      await service.onTransferHost(hostSocket, targetPlayer.id)

      // Verify the host was changed
      expect(game.hostId).toBe(targetPlayer.id)

      // Verify only server message and game update events were sent (no specific host:transferred event)
      expect(sendToRoomSpy).toHaveBeenCalledTimes(2)
      expect(sendToRoomSpy).toHaveBeenCalledWith({
        room: game.code,
        event: "message:server",
        data: expect.arrayContaining([
          expect.objectContaining({
            type: CoreConstants.SERVER_MESSAGE_TYPE.HOST_TRANSFERRED,
            name: targetPlayer.name,
          }),
        ]),
      })
      expect(sendToRoomSpy).toHaveBeenCalledWith({
        room: game.code,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            game: expect.objectContaining({
              hostId: targetPlayer.id,
            }),
          }),
        ]),
      })

      // Verify server message was sent
      expect(sendServerMessageSpy).toHaveBeenCalledWith(
        game.code,
        targetPlayer.name,
        CoreConstants.SERVER_MESSAGE_TYPE.HOST_TRANSFERRED,
      )

      // Verify game state was updated and sent
      expect(updateAndSendGameSpy).toHaveBeenCalled()
    })

    it("should work when transferring to different players", async () => {
      // First transfer from host to target
      await service.onTransferHost(hostSocket, targetPlayer.id)
      expect(game.hostId).toBe(targetPlayer.id)

      // Now transfer from target to observer (using target socket)
      targetSocket.data.playerId = targetPlayer.id
      await service.onTransferHost(targetSocket, observer.id)
      expect(game.hostId).toBe(observer.id)
    })

    it("should handle the case when state doesn't change", async () => {
      // Mock GameStateTracker to return null (no changes)
      vi.spyOn(GameStateTracker.prototype, "getChanges").mockReturnValue(null)

      // Execute the transfer without error
      await expect(
        service.onTransferHost(hostSocket, targetPlayer.id),
      ).resolves.not.toThrow()

      // Verify host was still changed
      expect(game.hostId).toBe(targetPlayer.id)
    })

    it("should not allow transfer to already disconnected players", async () => {
      // Set target as disconnected
      targetPlayer.connectionStatus =
        CoreConstants.CONNECTION_STATUS.DISCONNECTED

      await expect(
        service.onTransferHost(hostSocket, targetPlayer.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_CONNECTED)
    })

    it("should not allow transfer to players who left", async () => {
      // Set target as left
      targetPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.LEAVE

      await expect(
        service.onTransferHost(hostSocket, targetPlayer.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_CONNECTED)
    })

    it("should update game timestamp", async () => {
      const initialUpdatedAt = game.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await service.onTransferHost(hostSocket, targetPlayer.id)

      expect(game.updatedAt.getTime()).toBeGreaterThan(
        initialUpdatedAt.getTime(),
      )
    })
  })
})
