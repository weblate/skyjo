import type { BaseService } from "@/realtime/base/base.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import type { Game } from "@skymo/core"
import { TEST_SOCKET_ID } from "@tests/constants-test.js"
import { vi } from "vitest"

export const mockSocket = (id: string = TEST_SOCKET_ID) => {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn(), volatile: { emit: vi.fn() } })),
    leave: vi.fn(),
    data: {},
    id,
    connected: true,
    disconnected: false,
    recovered: true,
    volatile: {
      emit: vi.fn(),
    },
  } as unknown as GameSocket
}

export const mockRedisInService = (service: BaseService) => {
  service["redis"].getGame = vi.fn(() =>
    Promise.reject(new Error("This is the default mock of getGame")),
  )
  service["redis"].getPublicGames = vi.fn(() =>
    Promise.reject(new Error("This is the default mock of getPublicGames")),
  )
  service["redis"].canReconnectPlayer = vi.fn(() =>
    Promise.reject(new Error("This is the default mock of canReconnectPlayer")),
  )

  // these methods doesn't need to be mocked inside tests because they return void
  service["redis"].createGame = vi.fn()
  service["redis"].updateGame = vi.fn()
  service["redis"].updatePlayer = vi.fn()
  service["redis"].updatePlayerSocketId = vi.fn()
  service["redis"].removeGame = vi.fn()
}
export const mockSocketManagerInService = (service: BaseService) => {
  service["socketManager"].getIO = vi.fn().mockReturnValue({
    ...mockSocket(),
  })
  service["socketManager"].getSocket = vi.fn().mockReturnValue({
    volatile: {
      emit: vi.fn(),
    },
  })
  service["socketManager"].isInitialized = vi.fn().mockReturnValue(true)
  service["socketManager"].sendGameToSocket = vi.fn()
  service["socketManager"].sendToRoom = vi.fn()
  service["socketManager"].sendToSocket = vi.fn()
  service["socketManager"].setIO = vi.fn()
}
export const mockBullMQ = () => {
  vi.mock("bullmq", () => {
    return {
      Queue: vi.fn().mockImplementation(() => ({
        add: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      })),
      Worker: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
      })),
      Job: vi.fn().mockImplementation((_, data) => ({
        data,
        id: "test-job-id",
        attemptsMade: 0,
        opts: { attempts: 3 },
        moveToCompleted: vi.fn().mockResolvedValue(undefined),
        token: "test-token",
      })),
    }
  })
}
export const mockGameOperationManager = (game: Game) => {
  const instance = vi.fn().mockReturnValue({
    updateGame: vi.fn().mockResolvedValue(undefined),
    removeGame: vi.fn().mockResolvedValue(undefined),
    startRevealCardsAfkTimer: vi.fn().mockResolvedValue(undefined),
    cancelRevealCardsAfkTimer: vi.fn().mockResolvedValue(undefined),
    startPlayerAfkTimer: vi.fn().mockResolvedValue(undefined),
    cancelPlayerAfkTimer: vi.fn().mockResolvedValue(undefined),
    getSocket: vi.fn().mockReturnValue(mockSocket()),
    kickSocket: vi.fn().mockResolvedValue(undefined),
    delayNewRound: vi.fn(),

    redis: {
      getGame: vi.fn(() =>
        Promise.reject(new Error("This is the default mock of getGame")),
      ),
      getPublicGames: vi.fn(() =>
        Promise.reject(new Error("This is the default mock of getPublicGames")),
      ),
      canReconnectPlayer: vi.fn(() =>
        Promise.reject(
          new Error("This is the default mock of canReconnectPlayer"),
        ),
      ),
      createGame: vi.fn(),
      updateGame: vi.fn(),
      updatePlayer: vi.fn(),
      updatePlayerSocketId: vi.fn(),
      removeGame: vi.fn(),
    },
    socketManager: {
      getIO: vi.fn().mockReturnValue({
        ...mockSocket(),
      }),
      getSocket: vi.fn().mockReturnValue(mockSocket()),
      isInitialized: vi.fn().mockReturnValue(true),
      sendGameToSocket: vi.fn(),
      sendToRoom: vi.fn(),
      sendToSocket: vi.fn(),
      setIO: vi.fn(),
    },
    playerAfkQueue: {
      startTimer: vi.fn().mockResolvedValue(undefined),
      cancelTimer: vi.fn().mockResolvedValue(undefined),
    },
    revealCardsAfkQueue: {
      startTimer: vi.fn().mockResolvedValue(undefined),
      cancelTimer: vi.fn().mockResolvedValue(undefined),
    },
  })

  game.setOperationManager = instance
  return instance
}
export const mockGameStateTracker = (game: Game) => {
  return {
    GameStateTracker: {
      getChanges: vi.fn().mockReturnValue(null),
      previousState: {},
      game,
    },
  }
}
