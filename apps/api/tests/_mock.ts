import type { BaseService } from "@/socketio/services/base.service.js"
import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
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
  } as unknown as SkyjoSocket
}

export const mockRedis = (service: BaseService) => {
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
export const mockGameRepository = () => {
  vi.mock("../src/redis/game.repository.js", () => ({
    GameRepository: vi.fn().mockImplementation(() => ({
      getGame: vi.fn().mockResolvedValue({
        code: "TEST123",
        settings: { private: false },
        setOperationManager: vi.fn(),
        disconnectPlayer: vi.fn().mockResolvedValue(undefined),
        processingAfk: false,
        currentPlayer: { id: "player1", name: "Player 1" },
        players: [
          { id: "player1", name: "Player 1", socketId: "socket1" },
          { id: "player2", name: "Player 2", socketId: "socket2" },
        ],
        findPlayerById: vi.fn().mockImplementation((id) => {
          if (id === "player1")
            return { id: "player1", name: "Player 1", socketId: "socket1" }
          if (id === "player2")
            return { id: "player2", name: "Player 2", socketId: "socket2" }
          return null
        }),
      }),
      updateGame: vi.fn().mockResolvedValue(undefined),
    })),
  }))
}
export const mockSocketManager = () => {
  // virer ça et mock come le redis pour juste l'injecter dans le service
  vi.mock("@/socketio/utils/SocketManager.js", () => ({
    SocketManager: {
      getInstance: vi.fn().mockReturnValue({
        getSocket: vi.fn().mockReturnValue({
          volatile: {
            emit: vi.fn(),
          },
        }),
        getIO: vi.fn().mockReturnValue({
          ...mockSocket(),
        }),
        sendToSocket: vi.fn(),
        sendToRoom: vi.fn(),
      }),
    },
  }))
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
export const mockGameOperationManager = () => {
  vi.mock("@/socketio/utils/GameOperationManager.js", () => ({
    GameOperationManager: {
      getInstance: vi.fn().mockReturnValue({}),
    },
  }))
}
export const mockGameStateTracker = () => {
  vi.mock("@/socketio/utils/GameStateTracker.js", () => ({
    GameStateTracker: {
      getChanges: vi.fn().mockReturnValue(null),
      previousState: {},
      game: {},
    },
  }))
}
