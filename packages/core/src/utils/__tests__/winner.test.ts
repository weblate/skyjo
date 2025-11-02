import { describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import type { PlayerToJson } from "../../types/player.js"
import { getPlayerRanks } from "../winner.js"

const createMockPlayer = (
  overrides: Partial<PlayerToJson> = {},
): PlayerToJson => ({
  id: crypto.randomUUID(),
  name: "Player",
  socketId: "socket-123",
  avatar: Constants.AVATARS.BEE,
  score: 0,
  wantsReplay: false,
  connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
  scores: [],
  turnStartTime: null,
  timeout: 40000,
  cards: [],
  forfeited: false,
  forfeitedAt: null,
  hasRevealedCardCount: false,
  ...overrides,
})

describe("getPlayerRanks", () => {
  describe("edge cases", () => {
    it("should return empty object for empty players array", () => {
      const ranks = getPlayerRanks([])
      expect(ranks).toEqual({})
    })

    it("should handle single player", () => {
      const player = createMockPlayer({
        id: "player1",
        score: 10,
        scores: [10],
      })
      const ranks = getPlayerRanks([player])
      expect(ranks).toEqual({ player1: 1 })
    })
  })

  describe("first round (nbRounds === 0)", () => {
    it("should return '-' for all players when no rounds completed", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({ id: "player1", score: 0, scores: [] }),
        createMockPlayer({ id: "player2", score: 0, scores: [] }),
        createMockPlayer({ id: "player3", score: 0, scores: [] }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks).toEqual({
        player1: "-",
        player2: "-",
        player3: "-",
      })
    })
  })

  describe("after first round", () => {
    it("should assign rank 1 to player with lowest score", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({ id: "player1", score: 10, scores: [10] }),
        createMockPlayer({ id: "player2", score: 5, scores: [5] }),
        createMockPlayer({ id: "player3", score: 15, scores: [15] }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks.player2).toBe(1)
      expect(ranks.player1).toBe(2)
      expect(ranks.player3).toBe(3)
    })

    it("should handle tied scores with same rank", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({ id: "player1", score: 10, scores: [10] }),
        createMockPlayer({ id: "player2", score: 10, scores: [10] }),
        createMockPlayer({ id: "player3", score: 15, scores: [15] }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks.player1).toBe(1)
      expect(ranks.player2).toBe(1)
      expect(ranks.player3).toBe(3)
    })

    it("should handle multiple tied groups", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({ id: "player1", score: 10, scores: [10] }),
        createMockPlayer({ id: "player2", score: 10, scores: [10] }),
        createMockPlayer({ id: "player3", score: 20, scores: [20] }),
        createMockPlayer({ id: "player4", score: 20, scores: [20] }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks.player1).toBe(1)
      expect(ranks.player2).toBe(1)
      expect(ranks.player3).toBe(3)
      expect(ranks.player4).toBe(3)
    })
  })

  describe("connection status priority", () => {
    it("should rank connected players before disconnected players with same score", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "disconnected",
          name: "Alice",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
        }),
        createMockPlayer({
          id: "connected",
          name: "Bob",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks.connected).toBe(1)
      expect(ranks.disconnected).toBe(1)
    })

    it("should rank all connected players before all disconnected players", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "disconnected1",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
        }),
        createMockPlayer({
          id: "connected1",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
        createMockPlayer({
          id: "connected2",
          score: 15,
          scores: [15],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
        createMockPlayer({
          id: "disconnected2",
          score: 3,
          scores: [3],
          connectionStatus: Constants.CONNECTION_STATUS.LOST,
        }),
      ]

      const ranks = getPlayerRanks(players)

      // Connected players come first in sort order
      // Ranks are based on score comparison in the sorted array
      // winningScore = 3, so disconnected2 is a "winner"
      // Sorted order: [connected1(10), connected2(15), disconnected2(3), disconnected1(5)]
      // Rank calculation:
      // - connected1: rank 1
      // - connected2: 15 > 10, rank = 2
      // - disconnected2: 3 < 15, rank stays 2
      // - disconnected1: 5 > 3, rank = 4
      expect(ranks.connected1).toBe(1)
      expect(ranks.connected2).toBe(2)
      expect(ranks.disconnected2).toBe(2) // Same rank as connected2 due to score decrease
      expect(ranks.disconnected1).toBe(4)
    })

    it("should handle LOST connection status as disconnected", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "lost",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.LOST,
        }),
        createMockPlayer({
          id: "connected",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
      ]

      const ranks = getPlayerRanks(players)

      // winningScore = 5, so "lost" is a winner
      // Sorted order: [connected(10), lost(5)]
      // Ranks: connected=1, lost=1 (score decreased from 10 to 5)
      expect(ranks.connected).toBe(1)
      expect(ranks.lost).toBe(1)
    })

    it("should handle LEAVE connection status as disconnected", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "leave",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.LEAVE,
        }),
        createMockPlayer({
          id: "connected",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
      ]

      const ranks = getPlayerRanks(players)

      // winningScore = 5, so "leave" is a winner
      // Sorted order: [connected(10), leave(5)]
      // Ranks: connected=1, leave=1 (score decreased from 10 to 5)
      expect(ranks.connected).toBe(1)
      expect(ranks.leave).toBe(1)
    })
  })

  describe("winner sorting (alphabetical by name)", () => {
    it("should sort winners alphabetically by name", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "player1",
          name: "Zoe",
          score: 10,
          scores: [10],
        }),
        createMockPlayer({
          id: "player2",
          name: "Alice",
          score: 10,
          scores: [10],
        }),
        createMockPlayer({
          id: "player3",
          name: "Mike",
          score: 10,
          scores: [10],
        }),
      ]

      const ranks = getPlayerRanks(players)

      // All have same rank (tied), but internally sorted by name
      expect(ranks.player1).toBe(1)
      expect(ranks.player2).toBe(1)
      expect(ranks.player3).toBe(1)
    })

    it("should sort winners by name and losers by score", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({ id: "winner1", name: "Zoe", score: 5, scores: [5] }),
        createMockPlayer({
          id: "winner2",
          name: "Alice",
          score: 5,
          scores: [5],
        }),
        createMockPlayer({
          id: "loser1",
          name: "Mike",
          score: 15,
          scores: [15],
        }),
        createMockPlayer({
          id: "loser2",
          name: "Bob",
          score: 10,
          scores: [10],
        }),
      ]

      const ranks = getPlayerRanks(players)

      // Winners (score 5) should be ranked 1, sorted by name
      expect(ranks.winner2).toBe(1) // Alice
      expect(ranks.winner1).toBe(1) // Zoe
      // Losers ranked by score
      expect(ranks.loser2).toBe(3) // Bob (score 10)
      expect(ranks.loser1).toBe(4) // Mike (score 15)
    })
  })

  describe("complex scenarios", () => {
    it("should handle combination of connection status, winners, and losers", () => {
      const players: PlayerToJson[] = [
        // Connected winner
        createMockPlayer({
          id: "connected-winner1",
          name: "Bob",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
        // Connected winner
        createMockPlayer({
          id: "connected-winner2",
          name: "Alice",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
        // Connected loser
        createMockPlayer({
          id: "connected-loser",
          score: 20,
          scores: [20],
          connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        }),
        // Disconnected winner
        createMockPlayer({
          id: "disconnected-winner",
          name: "Zoe",
          score: 5,
          scores: [5],
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
        }),
        // Disconnected loser
        createMockPlayer({
          id: "disconnected-loser",
          score: 10,
          scores: [10],
          connectionStatus: Constants.CONNECTION_STATUS.DISCONNECTED,
        }),
      ]

      const ranks = getPlayerRanks(players)

      // winningScore = 5
      // Sorted order: [connected-winner2(Alice,5), connected-winner1(Bob,5), connected-loser(20), disconnected-winner(Zoe,5), disconnected-loser(10)]
      // Rank calculation:
      // - connected-winner2: rank 1
      // - connected-winner1: 5 = 5, rank stays 1
      // - connected-loser: 20 > 5, rank = 3
      // - disconnected-winner: 5 < 20, rank stays 3
      // - disconnected-loser: 10 > 5, rank = 5
      expect(ranks["connected-winner2"]).toBe(1) // Alice
      expect(ranks["connected-winner1"]).toBe(1) // Bob
      expect(ranks["connected-loser"]).toBe(3)
      expect(ranks["disconnected-winner"]).toBe(3) // Zoe (same rank as connected-loser)
      expect(ranks["disconnected-loser"]).toBe(5)
    })

    it("should correctly handle multiple rounds with accumulating scores", () => {
      const players: PlayerToJson[] = [
        createMockPlayer({
          id: "player1",
          score: 30,
          scores: [10, 10, 10],
        }),
        createMockPlayer({
          id: "player2",
          score: 25,
          scores: [10, 5, 10],
        }),
        createMockPlayer({
          id: "player3",
          score: 35,
          scores: [15, 10, 10],
        }),
      ]

      const ranks = getPlayerRanks(players)

      expect(ranks.player2).toBe(1)
      expect(ranks.player1).toBe(2)
      expect(ranks.player3).toBe(3)
    })
  })
})
