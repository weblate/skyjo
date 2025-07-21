import { Constants } from "@skymo/core"
import type { GameStorageJobData } from "@skymo/worker-types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GameStorageTask } from "../GameStorageTask.js"

// Mock the database and logger
vi.mock("@/postgres.js", () => ({
  db: {
    transaction: vi.fn(),
  },
}))

vi.mock("@skymo/logger", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@skymo/database/schema", () => ({
  gameTable: {
    id: "id",
  },
  playerTable: {
    id: "id",
    name: "name",
  },
  scoreTable: {},
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}))

describe("GameStorageTask", () => {
  let mockTransaction: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock transaction
    mockTransaction = vi.fn().mockImplementation(async (callback) => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }
      return await callback(mockTx)
    })
  })

  describe("calculatePlayerRanks", () => {
    // Access private method for testing
    const calculatePlayerRanks = (GameStorageTask as any).calculatePlayerRanks

    it("should rank connected players first, then disconnected players", () => {
      const players = [
        {
          id: "player1",
          name: "Maxent",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 20,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket1",
          userId: 1,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session1",
          cards: [],
          scores: [10, 10],
        },
        {
          id: "player2",
          name: "Marie",
          connectionStatus: Constants.CONNECTION_STATUS.LEAVE,
          score: 22,
          avatar: Constants.AVATARS.CAT,
          socketId: "socket2",
          userId: 2,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session2",
          cards: [],
          scores: [11, 11],
        },
        {
          id: "player3",
          name: "Pierre",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 1,
          avatar: Constants.AVATARS.DOG,
          socketId: "socket3",
          userId: 3,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session3",
          cards: [],
          scores: [1],
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      expect(rankedPlayers).toHaveLength(3)

      // Find players by name to check ranks
      const maxent = rankedPlayers.find((p) => p.name === "Maxent")
      const marie = rankedPlayers.find((p) => p.name === "Marie")
      const pierre = rankedPlayers.find((p) => p.name === "Pierre")

      expect(maxent?.rank).toBe(1) // Best connected player
      expect(marie?.rank).toBe(2) // Second connected player
      expect(pierre?.rank).toBe(3) // Disconnected player ranks last despite best score
    })

    it("should handle multiple disconnected players with different scores", () => {
      const players = [
        {
          id: "player1",
          name: "Connected1",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 50,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket1",
          userId: 1,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session1",
          cards: [],
          scores: [25, 25],
        },
        {
          id: "player2",
          name: "Disconnected1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 5,
          avatar: Constants.AVATARS.CAT,
          socketId: "socket2",
          userId: 2,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session2",
          cards: [],
          scores: [5],
        },
        {
          id: "player3",
          name: "Disconnected2",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 10,
          avatar: Constants.AVATARS.DOG,
          socketId: "socket3",
          userId: 3,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session3",
          cards: [],
          scores: [10],
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const connected1 = rankedPlayers.find((p) => p.name === "Connected1")
      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )
      const disconnected2 = rankedPlayers.find(
        (p) => p.name === "Disconnected2",
      )

      expect(connected1?.rank).toBe(1) // Only connected player
      expect(disconnected1?.rank).toBe(2) // Best disconnected player (score 5)
      expect(disconnected2?.rank).toBe(3) // Worse disconnected player (score 10)
    })

    it("should handle all connected players", () => {
      const players = [
        {
          id: "player1",
          name: "Player1",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 10,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket1",
          userId: 1,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session1",
          cards: [],
          scores: [5, 5],
        },
        {
          id: "player2",
          name: "Player2",
          connectionStatus: Constants.CONNECTION_STATUS.LOST,
          score: 5,
          avatar: Constants.AVATARS.CAT,
          socketId: "socket2",
          userId: 2,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session2",
          cards: [],
          scores: [5],
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const player1 = rankedPlayers.find((p) => p.name === "Player1")
      const player2 = rankedPlayers.find((p) => p.name === "Player2")

      expect(player2?.rank).toBe(1) // Better score (5)
      expect(player1?.rank).toBe(2) // Worse score (10)
    })

    it("should handle all disconnected players", () => {
      const players = [
        {
          id: "player1",
          name: "Disconnected1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 20,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket1",
          userId: 1,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session1",
          cards: [],
          scores: [10, 10],
        },
        {
          id: "player2",
          name: "Disconnected2",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 15,
          avatar: Constants.AVATARS.CAT,
          socketId: "socket2",
          userId: 2,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session2",
          cards: [],
          scores: [15],
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )
      const disconnected2 = rankedPlayers.find(
        (p) => p.name === "Disconnected2",
      )

      expect(disconnected2?.rank).toBe(1) // Better score (15)
      expect(disconnected1?.rank).toBe(2) // Worse score (20)
    })

    it("should handle players with same scores", () => {
      const players = [
        {
          id: "player1",
          name: "Connected1",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 10,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket1",
          userId: 1,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session1",
          cards: [],
          scores: [5, 5],
        },
        {
          id: "player2",
          name: "Connected2",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 10,
          avatar: Constants.AVATARS.CAT,
          socketId: "socket2",
          userId: 2,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session2",
          cards: [],
          scores: [5, 5],
        },
        {
          id: "player3",
          name: "Disconnected1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 10,
          avatar: Constants.AVATARS.DOG,
          socketId: "socket3",
          userId: 3,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session3",
          cards: [],
          scores: [5, 5],
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const connected1 = rankedPlayers.find((p) => p.name === "Connected1")
      const connected2 = rankedPlayers.find((p) => p.name === "Connected2")
      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )

      // Connected players should rank 1 and 1 (tied)
      expect(connected1?.rank).toBe(1)
      expect(connected2?.rank).toBe(1)
      // Disconnected player should rank after connected players (3)
      expect(disconnected1?.rank).toBe(3)
    })
  })
})
