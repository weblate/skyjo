import type { GameToJson, PlayerToJson } from "@skymo/core"
import { describe, expect, it } from "vitest"
import { applyStateOperations } from "../apply.js"
import type { GameOperation } from "../types.js"

const createMockGameState = (overrides?: Partial<GameToJson>): GameToJson => ({
  code: "TEST123",
  status: 1, // LOBBY
  hostId: "player-1",
  turn: 1,
  selectedCardValue: null,
  roundPhase: 2, // MAIN
  turnStatus: 1, // CHOOSE_A_PILE
  lastTurnStatus: null,
  stateVersion: 1,
  updatedAt: new Date(),
  settings: {
    isConfirmed: false,
    private: false,
    maxPlayers: 8,
    removeIdenticalColumn: true,
    removeIdenticalRow: false,
    initialTurnedCount: 2,
    cardPerRow: 3,
    cardPerColumn: 4,
    scoreToEndGame: 100,
    firstPlayerMultiplierPenalty: 2,
    firstPlayerFlatPenalty: 0,
    firstPlayerPenaltyType: 1,
    showCurrentScore: false,
    playerRearrangement: 0,
  },
  players: [],
  ...overrides,
})

const createMockPlayer = (overrides?: Partial<PlayerToJson>): PlayerToJson => ({
  id: "player-1",
  name: "Test Player",
  username: "testuser",
  avatar: "bee",
  socketId: "socket-123",
  score: 0,
  wantsReplay: false,
  connectionStatus: 1, // CONNECTED
  scores: [],
  turnStartTime: null,
  cards: [
    [{ id: "c1", isVisible: false }, { id: "c2", isVisible: false }],
    [{ id: "c3", isVisible: false }, { id: "c4", isVisible: false }],
  ],
  userId: null,
  guestId: null,
  forfeited: false,
  forfeitedAt: null,
  hasRevealedCardCount: false,
  ...overrides,
})

describe("applyStateOperations", () => {
  describe("game field updates", () => {
    it("should update basic game fields", () => {
      const game = createMockGameState({ status: 1, stateVersion: 1 }) // LOBBY
      const operations: GameOperation = {
        game: {
          status: 2, // PLAYING
          selectedCardValue: 5,
          stateVersion: 2,
        },
      }

      const result = applyStateOperations(game, operations)

      expect(result.status).toBe(2)
      expect(result.selectedCardValue).toBe(5)
      expect(result.stateVersion).toBe(2)
    })

    it("should update multiple game fields", () => {
      const game = createMockGameState({
        status: 1, // LOBBY
        turnStatus: 1, // CHOOSE_A_PILE
        selectedCardValue: null,
        stateVersion: 1
      })
      const operations: GameOperation = {
        game: {
          status: 2, // PLAYING
          turnStatus: 2, // THROW_OR_REPLACE
          selectedCardValue: 3,
          stateVersion: 2,
        },
      }

      const result = applyStateOperations(game, operations)

      expect(result.status).toBe(2)
      expect(result.turnStatus).toBe(2)
      expect(result.selectedCardValue).toBe(3)
      expect(result.stateVersion).toBe(2)
    })
  })

  describe("settings updates", () => {
    it("should update settings fields", () => {
      const game = createMockGameState()
      const operations: GameOperation = {
        settings: {
          maxPlayers: 6,
          scoreToEndGame: 50,
        },
      }

      const result = applyStateOperations(game, operations)

      expect(result.settings.maxPlayers).toBe(6)
      expect(result.settings.scoreToEndGame).toBe(50)
      // Other settings should remain unchanged
      expect(result.settings.cardPerColumn).toBe(4)
      expect(result.settings.cardPerRow).toBe(3)
    })

    it("should update single settings field", () => {
      const game = createMockGameState()
      const operations: GameOperation = {
        settings: {
          private: true,
        },
      }

      const result = applyStateOperations(game, operations)

      expect(result.settings.private).toBe(true)
      // Other settings should remain unchanged
      expect(result.settings.maxPlayers).toBe(8)
    })
  })

  describe("player operations", () => {
    it("should add players", () => {
      const game = createMockGameState({ players: [] })
      const newPlayer1 = createMockPlayer({ id: "player-1" })
      const newPlayer2 = createMockPlayer({ id: "player-2" })

      const operations: GameOperation = {
        addPlayers: [newPlayer1, newPlayer2],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(2)
      expect(result.players[0]).toEqual(newPlayer1)
      expect(result.players[1]).toEqual(newPlayer2)
    })

    it("should add players to existing list", () => {
      const existingPlayer = createMockPlayer({ id: "player-1" })
      const game = createMockGameState({ players: [existingPlayer] })
      const newPlayer = createMockPlayer({ id: "player-2" })

      const operations: GameOperation = {
        addPlayers: [newPlayer],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(2)
      expect(result.players[0]).toEqual(existingPlayer)
      expect(result.players[1]).toEqual(newPlayer)
    })

    it("should update players", () => {
      const player1 = createMockPlayer({ id: "player-1", score: 0, wantsReplay: false })
      const player2 = createMockPlayer({ id: "player-2", score: 5, wantsReplay: true })
      const game = createMockGameState({ players: [player1, player2] })

      const operations: GameOperation = {
        updatePlayers: [
          { id: "player-1", score: 10, wantsReplay: true },
          { id: "player-2", score: 8 },
        ],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players[0].score).toBe(10)
      expect(result.players[0].wantsReplay).toBe(true)
      expect(result.players[0].name).toBe("Test Player") // unchanged field

      expect(result.players[1].score).toBe(8)
      expect(result.players[1].wantsReplay).toBe(true) // unchanged field
    })

    it("should ignore updates for non-existent players", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const game = createMockGameState({ players: [player1] })

      const operations: GameOperation = {
        updatePlayers: [
          { id: "non-existent", score: 10 },
        ],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(1)
      expect(result.players[0]).toEqual(player1)
    })

    it("should remove players", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const player2 = createMockPlayer({ id: "player-2" })
      const player3 = createMockPlayer({ id: "player-3" })
      const game = createMockGameState({ players: [player1, player2, player3] })

      const operations: GameOperation = {
        removePlayers: ["player-1", "player-3"],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(1)
      expect(result.players[0]).toEqual(player2)
    })

    it("should handle removing non-existent players gracefully", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const game = createMockGameState({ players: [player1] })

      const operations: GameOperation = {
        removePlayers: ["non-existent"],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(1)
      expect(result.players[0]).toEqual(player1)
    })

    it("should reorder players", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const player2 = createMockPlayer({ id: "player-2" })
      const player3 = createMockPlayer({ id: "player-3" })
      const game = createMockGameState({ players: [player1, player2, player3] })

      const operations: GameOperation = {
        reorderPlayers: ["player-3", "player-1", "player-2"],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(3)
      expect(result.players[0]).toEqual(player3)
      expect(result.players[1]).toEqual(player1)
      expect(result.players[2]).toEqual(player2)
    })

    it("should handle reordering with missing players", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const player2 = createMockPlayer({ id: "player-2" })
      const game = createMockGameState({ players: [player1, player2] })

      const operations: GameOperation = {
        reorderPlayers: ["player-2", "non-existent", "player-1"],
      }

      const result = applyStateOperations(game, operations)

      expect(result.players).toHaveLength(2)
      expect(result.players[0]).toEqual(player2)
      expect(result.players[1]).toEqual(player1)
    })
  })

  describe("card cleanup", () => {
    it("should clean up undefined cards", () => {
      const player = createMockPlayer({
        id: "player-1",
        cards: [
          [{ id: "c1", value: 1, isVisible: true }, undefined as any, { id: "c2", value: 2, isVisible: true }],
          [undefined as any, { id: "c3", isVisible: false }],
          [{ id: "c4", value: 3, isVisible: true }, undefined as any],
        ],
      })
      const game = createMockGameState({ players: [player] })

      const operations: GameOperation = {}

      const result = applyStateOperations(game, operations)

      // The filter operation removes undefined values, which changes array lengths
      expect(result.players[0].cards).toEqual([
        [{ id: "c1", value: 1, isVisible: true }, { id: "c2", value: 2, isVisible: true }],
        [{ id: "c3", isVisible: false }],
        [{ id: "c4", value: 3, isVisible: true }],
      ])
    })

    it("should handle empty rows after cleanup", () => {
      const player = createMockPlayer({
        id: "player-1",
        cards: [
          [undefined as any, undefined as any],
          [{ id: "c1", value: 1, isVisible: true }],
          [undefined as any],
        ],
      })
      const game = createMockGameState({ players: [player] })

      const operations: GameOperation = {}

      const result = applyStateOperations(game, operations)

      expect(result.players[0].cards).toEqual([
        [],
        [{ id: "c1", value: 1, isVisible: true }],
        [],
      ])
    })
  })

  describe("complex operations", () => {
    it("should apply multiple operations in sequence", () => {
      const player1 = createMockPlayer({ id: "player-1", score: 0 })
      const player2 = createMockPlayer({ id: "player-2", score: 5 })
      const game = createMockGameState({
        status: 1, // LOBBY
        players: [player1, player2],
        stateVersion: 1
      })

      const newPlayer = createMockPlayer({ id: "player-3", score: 0 })

      const operations: GameOperation = {
        game: {
          status: 2, // PLAYING
          stateVersion: 2,
        },
        settings: {
          maxPlayers: 6,
        },
        updatePlayers: [
          { id: "player-1", score: 10 },
        ],
        removePlayers: ["player-2"],
        addPlayers: [newPlayer],
      }

      const result = applyStateOperations(game, operations)

      expect(result.status).toBe(2)
      expect(result.stateVersion).toBe(2)
      expect(result.settings.maxPlayers).toBe(6)
      expect(result.players).toHaveLength(2)
      expect(result.players[0].id).toBe("player-1")
      expect(result.players[0].score).toBe(10)
      expect(result.players[1]).toEqual(newPlayer)
    })

    it("should handle empty operations gracefully", () => {
      const game = createMockGameState()
      const operations: GameOperation = {}

      const result = applyStateOperations(game, operations)

      expect(result).toBe(game) // Should return the same object
    })

    it("should apply operations with undefined/null values gracefully", () => {
      const game = createMockGameState()
      const operations: GameOperation = {
        game: undefined,
        settings: undefined,
        addPlayers: undefined,
        updatePlayers: undefined,
        removePlayers: undefined,
        reorderPlayers: undefined,
      }

      const result = applyStateOperations(game, operations)

      expect(result).toBe(game) // Should return the same object
    })
  })

  describe("mutability", () => {
    it("should mutate the original game object", () => {
      const game = createMockGameState({ status: "WAITING" })
      const operations: GameOperation = {
        game: { status: "PLAYING" },
      }

      const result = applyStateOperations(game, operations)

      expect(result).toBe(game) // Same reference
      expect(game.status).toBe("PLAYING") // Original object is mutated
    })
  })
})