import type { GameToJson, PlayerToJson } from "@skymo/core"
import { describe, expect, it } from "vitest"
import { applyStateOperations } from "../apply.js"
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

describe("State Operations Integration", () => {
  it("should create and apply operations correctly - simple case", () => {
    const originalState = createMockGameState({
      status: 1, // LOBBY
      stateVersion: 1
    })
    const targetState = createMockGameState({
      status: 2, // PLAYING
      stateVersion: 2
    })

    // Create operations from the diff
    const operations = createStateOperations(originalState, targetState)

    // Apply operations to original state
    const resultState = applyStateOperations(
      JSON.parse(JSON.stringify(originalState)), // Deep copy to avoid mutation
      operations
    )

    expect(resultState.status).toBe(targetState.status)
    expect(resultState.stateVersion).toBe(targetState.stateVersion)
  })

  it("should create and apply operations correctly - complex case with added player", () => {
    const player1 = createMockPlayer({ id: "player-1", score: 0, wantsReplay: false })
    const player2 = createMockPlayer({ id: "player-2", score: 5, wantsReplay: true })

    const originalState = createMockGameState({
      status: 1, // LOBBY
      players: [player1, player2],
      settings: { ...createMockGameState().settings, maxPlayers: 8 },
      stateVersion: 1
    })

    const updatedPlayer1 = createMockPlayer({ id: "player-1", score: 10, wantsReplay: true })
    const newPlayer3 = createMockPlayer({ id: "player-3", score: 0, wantsReplay: false })

    const targetState = createMockGameState({
      status: 2, // PLAYING
      selectedCardValue: 5,
      // More players than original (will use addPlayers for extra ones)
      players: [updatedPlayer1, player2, newPlayer3], // player1 updated, player2 unchanged, player3 added
      settings: { ...createMockGameState().settings, maxPlayers: 6 },
      stateVersion: 2
    })

    // Create operations from the diff
    const operations = createStateOperations(originalState, targetState)

    // Apply operations to original state
    const resultState = applyStateOperations(
      JSON.parse(JSON.stringify(originalState)), // Deep copy to avoid mutation
      operations
    )

    expect(resultState.status).toBe(2)
    expect(resultState.selectedCardValue).toBe(5)
    expect(resultState.stateVersion).toBe(2)
    expect(resultState.settings.maxPlayers).toBe(6)
    expect(resultState.players).toHaveLength(3)
    expect(resultState.players[0].id).toBe("player-1")
    expect(resultState.players[0].score).toBe(10)
    expect(resultState.players[0].wantsReplay).toBe(true)
    expect(resultState.players[1].id).toBe("player-2") // unchanged
    expect(resultState.players[2].id).toBe("player-3") // added
  })

  it("should create and apply player reordering correctly", () => {
    const player1 = createMockPlayer({ id: "player-1", score: 5 })
    const player2 = createMockPlayer({ id: "player-2", score: 10 })
    const player3 = createMockPlayer({ id: "player-3", score: 0 })

    const originalState = createMockGameState({
      players: [player1, player2, player3],
      stateVersion: 1
    })

    // Reorder players and update player1's score
    const updatedPlayer1 = createMockPlayer({ id: "player-1", score: 15 })
    const targetState = createMockGameState({
      players: [player3, updatedPlayer1, player2], // reordered + updated
      stateVersion: 2
    })

    // Create operations from the diff
    const operations = createStateOperations(originalState, targetState)

    // Apply operations to original state
    const resultState = applyStateOperations(
      JSON.parse(JSON.stringify(originalState)), // Deep copy to avoid mutation
      operations
    )

    expect(resultState.players).toHaveLength(3)
    expect(resultState.players[0].id).toBe("player-3")
    expect(resultState.players[1].id).toBe("player-1")
    expect(resultState.players[1].score).toBe(15) // Updated score
    expect(resultState.players[2].id).toBe("player-2")
    expect(resultState.stateVersion).toBe(2)
  })

  it("should handle card updates correctly", () => {
    const originalCards = [
      [{ id: "c1", isVisible: false }, { id: "c2", isVisible: false }],
      [{ id: "c3", isVisible: false }, { id: "c4", isVisible: false }],
    ]

    const updatedCards = [
      [{ id: "c1", value: 1, isVisible: true }, { id: "c2", isVisible: false }],
      [{ id: "c3", isVisible: false }, { id: "c4", value: 2, isVisible: true }],
    ]

    const originalPlayer = createMockPlayer({ id: "player-1", cards: originalCards })
    const originalState = createMockGameState({
      players: [originalPlayer],
      stateVersion: 1
    })

    const updatedPlayer = createMockPlayer({ id: "player-1", cards: updatedCards })
    const targetState = createMockGameState({
      players: [updatedPlayer],
      stateVersion: 2
    })

    // Create operations from the diff
    const operations = createStateOperations(originalState, targetState)

    // Apply operations to original state
    const resultState = applyStateOperations(
      JSON.parse(JSON.stringify(originalState)), // Deep copy to avoid mutation
      operations
    )

    expect(resultState.players[0].cards).toEqual(updatedCards)
    expect(resultState.stateVersion).toBe(2)
  })

  it("should be idempotent - applying no changes should result in same state", () => {
    const state = createMockGameState({
      status: 2, // PLAYING
      stateVersion: 5
    })

    // Create operations from the same state (should be empty)
    const operations = createStateOperations(state, state)

    // Apply operations
    const resultState = applyStateOperations(
      JSON.parse(JSON.stringify(state)), // Deep copy to avoid mutation
      operations
    )

    // Convert updatedAt back to Date for comparison since JSON.parse converts Date to string
    resultState.updatedAt = new Date(resultState.updatedAt)

    expect(resultState).toEqual(state)
    expect(operations).toEqual({})
  })

  it("should handle state synchronization scenario", () => {
    // Simulate a scenario where we have a local state and receive remote updates
    const localState = createMockGameState({
      status: 1, // LOBBY
      selectedCardValue: null,
      players: [createMockPlayer({ id: "player-1", score: 0 })],
      stateVersion: 1
    })

    // Simulate receiving a remote state
    const remoteState = createMockGameState({
      status: 2, // PLAYING
      selectedCardValue: 3,
      players: [
        createMockPlayer({ id: "player-1", score: 5 }),
        createMockPlayer({ id: "player-2", score: 0 })
      ],
      stateVersion: 3
    })

    // Create operations to sync local with remote
    const operations = createStateOperations(localState, remoteState)

    // Apply operations to local state
    const syncedState = applyStateOperations(
      JSON.parse(JSON.stringify(localState)), // Deep copy to avoid mutation
      operations
    )

    expect(syncedState.status).toBe(2)
    expect(syncedState.selectedCardValue).toBe(3)
    expect(syncedState.players).toHaveLength(2)
    expect(syncedState.players[0].score).toBe(5)
    expect(syncedState.stateVersion).toBe(3)
  })
})