import { Constants, PlayerRedisDb } from "@skymo/core"
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
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock transaction
    vi.fn().mockImplementation(async (callback) => {
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
    const calculatePlayerRanks = GameStorageTask["calculatePlayerRanks"]

    it("should rank connected players first, then disconnected players", () => {
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
      expect(disconnected1?.rank).toBe(3) // All disconnected players get worst rank (punitive)
      expect(disconnected2?.rank).toBe(3) // All disconnected players get worst rank (punitive)
    })

    it("should handle all connected players", () => {
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const player1 = rankedPlayers.find((p) => p.name === "Player1")
      const player2 = rankedPlayers.find((p) => p.name === "Player2")

      expect(player2?.rank).toBe(1) // Better score (5)
      expect(player1?.rank).toBe(2) // Worse score (10)
    })

    it("should handle all disconnected players", () => {
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )
      const disconnected2 = rankedPlayers.find(
        (p) => p.name === "Disconnected2",
      )

      expect(disconnected2?.rank).toBe(2) // All disconnected players get worst rank (punitive)
      expect(disconnected1?.rank).toBe(2) // All disconnected players get worst rank (punitive)
    })

    it("should handle players with same scores", () => {
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
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

    it("should rank players in 3-tier system: connected > forfeited > disconnected", () => {
      const players: PlayerRedisDb[] = [
        {
          id: "player1",
          name: "Connected1",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 30,
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
          scores: [15, 15],
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player2",
          name: "Forfeited1",
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
          forfeited: true,
          forfeitedAt: 1000,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player3",
          name: "Disconnected1",
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const connected1 = rankedPlayers.find((p) => p.name === "Connected1")
      const forfeited1 = rankedPlayers.find((p) => p.name === "Forfeited1")
      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )

      // Connected player ranks first despite higher score
      expect(connected1?.rank).toBe(1)
      // Forfeited player ranks second despite best score
      expect(forfeited1?.rank).toBe(2)
      // Disconnected player gets worst rank as punishment
      expect(disconnected1?.rank).toBe(3)
    })

    it("should rank multiple forfeited players by forfeit time (later forfeit = better rank)", () => {
      const players: PlayerRedisDb[] = [
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player2",
          name: "EarlyForfeit",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
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
          forfeited: true,
          forfeitedAt: 1000,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player3",
          name: "LateForfeit",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 20,
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
          scores: [10, 10],
          forfeited: true,
          forfeitedAt: 2000,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player4",
          name: "Disconnected1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 5,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket4",
          userId: 4,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session4",
          cards: [],
          scores: [5],
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const connected1 = rankedPlayers.find((p) => p.name === "Connected1")
      const earlyForfeit = rankedPlayers.find((p) => p.name === "EarlyForfeit")
      const lateForfeit = rankedPlayers.find((p) => p.name === "LateForfeit")
      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )

      expect(connected1?.rank).toBe(1) // Connected player first
      expect(lateForfeit?.rank).toBe(2) // Later forfeit = better rank
      expect(earlyForfeit?.rank).toBe(3) // Earlier forfeit = worse rank
      expect(disconnected1?.rank).toBe(4) // Disconnected players get worst rank
    })

    it("should handle mixed scenario with all three player types", () => {
      const players: PlayerRedisDb[] = [
        {
          id: "player1",
          name: "Connected1",
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
          score: 40,
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
          scores: [20, 20],
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player2",
          name: "Connected2",
          connectionStatus: Constants.CONNECTION_STATUS.LOST,
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
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player3",
          name: "Forfeited1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 5,
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
          scores: [5],
          forfeited: true,
          forfeitedAt: 1500,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player4",
          name: "Forfeited2",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 30,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket4",
          userId: 4,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session4",
          cards: [],
          scores: [15, 15],
          forfeited: true,
          forfeitedAt: 1000,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
        {
          id: "player5",
          name: "Disconnected1",
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
          score: 1,
          avatar: Constants.AVATARS.BEE,
          socketId: "socket5",
          userId: 5,
          wantsReplay: false,
          hasPlayedLastTurn: false,
          afkCount: 0,
          consecutiveAfkCount: 0,
          turnStartTime: null,
          sessionId: "session5",
          cards: [],
          scores: [1],
          forfeited: false,
          forfeitedAt: null,
          disconnectedAfkCount: 0,
          timeout: null,
          hasRevealedCardCount: false,
        },
      ]

      const rankedPlayers = calculatePlayerRanks(players)

      const connected1 = rankedPlayers.find((p) => p.name === "Connected1")
      const connected2 = rankedPlayers.find((p) => p.name === "Connected2")
      const forfeited1 = rankedPlayers.find((p) => p.name === "Forfeited1")
      const forfeited2 = rankedPlayers.find((p) => p.name === "Forfeited2")
      const disconnected1 = rankedPlayers.find(
        (p) => p.name === "Disconnected1",
      )

      // Tier 1: Connected players (by score)
      expect(connected2?.rank).toBe(1) // Best connected score (10)
      expect(connected1?.rank).toBe(2) // Worse connected score (40)

      // Tier 2: Forfeited players (by forfeit time - later = better)
      expect(forfeited1?.rank).toBe(3) // Later forfeit (1500ms)
      expect(forfeited2?.rank).toBe(4) // Earlier forfeit (1000ms)

      // Tier 3: Disconnected players (punitive worst rank)
      expect(disconnected1?.rank).toBe(5) // Total players count
    })
  })
})
