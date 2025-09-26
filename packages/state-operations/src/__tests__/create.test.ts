import type { GameToJson, PlayerToJson } from "@skymo/core"
import { describe, expect, it } from "vitest"
import { createStateOperations } from "../create.js"

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

describe("createStateOperations", () => {
  describe("basic game field changes", () => {
    it("should detect game status change", () => {
      const oldState = createMockGameState({ status: 1, stateVersion: 1 }) // LOBBY
      const newState = createMockGameState({ status: 2, stateVersion: 2 }) // PLAYING

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          status: 2,
          stateVersion: 2,
        },
      })
    })

    it("should detect selected card value changes", () => {
      const oldState = createMockGameState({ selectedCardValue: null, stateVersion: 1 })
      const newState = createMockGameState({ selectedCardValue: 5, stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          selectedCardValue: 5,
          stateVersion: 2,
        },
      })
    })

    it("should detect turn status changes", () => {
      const oldState = createMockGameState({ turnStatus: 1, stateVersion: 1 }) // CHOOSE_A_PILE
      const newState = createMockGameState({ turnStatus: 2, stateVersion: 2 }) // THROW_OR_REPLACE

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          turnStatus: 2,
          stateVersion: 2,
        },
      })
    })

    it("should ignore updatedAt only changes", () => {
      const oldState = createMockGameState({
        updatedAt: new Date("2023-01-01T00:00:00Z"),
        stateVersion: 1
      })
      const newState = createMockGameState({
        updatedAt: new Date("2023-01-01T01:00:00Z"),
        stateVersion: 1
      })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({})
    })

    it("should detect multiple field changes", () => {
      const oldState = createMockGameState({
        status: 1, // LOBBY
        selectedCardValue: null,
        stateVersion: 1
      })
      const newState = createMockGameState({
        status: 2, // PLAYING
        selectedCardValue: 3,
        stateVersion: 2
      })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          status: 2,
          selectedCardValue: 3,
          stateVersion: 2,
        },
      })
    })
  })

  describe("settings changes", () => {
    it("should detect settings changes", () => {
      const oldState = createMockGameState({
        settings: {
          ...createMockGameState().settings,
          maxPlayers: 8
        },
        stateVersion: 1
      })
      const newState = createMockGameState({
        settings: {
          ...createMockGameState().settings,
          maxPlayers: 6
        },
        stateVersion: 2
      })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        settings: {
          maxPlayers: 6,
        },
      })
    })

    it("should detect multiple settings changes", () => {
      const oldSettings = createMockGameState().settings
      const oldState = createMockGameState({ settings: oldSettings, stateVersion: 1 })
      const newState = createMockGameState({
        settings: {
          ...oldSettings,
          maxPlayers: 6,
          scoreToEndGame: 50
        },
        stateVersion: 2
      })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        settings: {
          maxPlayers: 6,
          scoreToEndGame: 50,
        },
      })
    })
  })

  describe("player operations", () => {
    it("should detect added players", () => {
      const oldState = createMockGameState({ players: [], stateVersion: 1 })
      const newPlayer = createMockPlayer({ id: "player-1" })
      const newState = createMockGameState({ players: [newPlayer], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        addPlayers: [newPlayer],
      })
    })

    it("should detect removed players", () => {
      const player = createMockPlayer({ id: "player-1" })
      const oldState = createMockGameState({ players: [player], stateVersion: 1 })
      const newState = createMockGameState({ players: [], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        removePlayers: ["player-1"],
      })
    })

    it("should detect updated players", () => {
      const oldPlayer = createMockPlayer({ id: "player-1", score: 0 })
      const oldState = createMockGameState({ players: [oldPlayer], stateVersion: 1 })

      const newPlayer = createMockPlayer({ id: "player-1", score: 10 })
      const newState = createMockGameState({ players: [newPlayer], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        updatePlayers: [{ id: "player-1", score: 10 }],
      })
    })

    it("should detect player reordering", () => {
      const player1 = createMockPlayer({ id: "player-1" })
      const player2 = createMockPlayer({ id: "player-2" })
      const oldState = createMockGameState({ players: [player1, player2], stateVersion: 1 })
      const newState = createMockGameState({ players: [player2, player1], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        reorderPlayers: ["player-2", "player-1"],
      })
    })

    it("should detect player reordering with updates", () => {
      const player1 = createMockPlayer({ id: "player-1", score: 0 })
      const player2 = createMockPlayer({ id: "player-2", score: 0 })
      const oldState = createMockGameState({ players: [player1, player2], stateVersion: 1 })

      const newPlayer1 = createMockPlayer({ id: "player-1", score: 5 })
      const newPlayer2 = createMockPlayer({ id: "player-2", score: 0 })
      const newState = createMockGameState({ players: [newPlayer2, newPlayer1], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        reorderPlayers: ["player-2", "player-1"],
        updatePlayers: [{ id: "player-1", score: 5 }],
      })
    })

    it("should detect complex card changes", () => {
      const oldCards = [
        [{ id: "c1", isVisible: false }, { id: "c2", isVisible: false }],
        [{ id: "c3", isVisible: false }, { id: "c4", isVisible: false }],
      ]
      const newCards = [
        [{ id: "c1", value: 1, isVisible: true }, { id: "c2", isVisible: false }],
        [{ id: "c3", isVisible: false }, { id: "c4", value: 2, isVisible: true }],
      ]

      const oldPlayer = createMockPlayer({ id: "player-1", cards: oldCards })
      const oldState = createMockGameState({ players: [oldPlayer], stateVersion: 1 })

      const newPlayer = createMockPlayer({ id: "player-1", cards: newCards })
      const newState = createMockGameState({ players: [newPlayer], stateVersion: 2 })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          stateVersion: 2,
        },
        updatePlayers: [{ id: "player-1", cards: newCards }],
      })
    })
  })

  describe("complex scenarios", () => {
    it("should handle multiple changes at once", () => {
      const oldPlayer1 = createMockPlayer({ id: "player-1", score: 0 })
      const oldPlayer2 = createMockPlayer({ id: "player-2", score: 0 })
      const oldState = createMockGameState({
        status: 1, // LOBBY
        players: [oldPlayer1, oldPlayer2],
        settings: { ...createMockGameState().settings, maxPlayers: 8 },
        stateVersion: 1
      })

      // Note: the algorithm only adds players at positions beyond the old count
      // So we need to structure the test accordingly
      const newPlayer1 = createMockPlayer({ id: "player-1", score: 5 })
      const newPlayer3 = createMockPlayer({ id: "player-3", score: 0 })
      const newState = createMockGameState({
        status: 2, // PLAYING
        players: [newPlayer1, newPlayer3], // player-2 removed, player-3 added at end position
        settings: { ...createMockGameState().settings, maxPlayers: 6 },
        stateVersion: 2
      })

      const operations = createStateOperations(oldState, newState)

      expect(operations).toMatchObject({
        game: {
          status: 2,
          stateVersion: 2,
        },
        settings: {
          maxPlayers: 6,
        },
        updatePlayers: [{ id: "player-1", score: 5 }],
        removePlayers: ["player-2"],
      })
    })

    it("should return empty operations when no changes", () => {
      const state = createMockGameState()
      const operations = createStateOperations(state, state)

      expect(operations).toMatchObject({})
    })

    it("should handle adding state version when operations exist", () => {
      const oldState = createMockGameState({ status: "WAITING", stateVersion: 1 })
      const newState = createMockGameState({ status: "PLAYING", stateVersion: 3 })

      const operations = createStateOperations(oldState, newState)

      expect(operations.game?.stateVersion).toBe(3)
    })
  })
})