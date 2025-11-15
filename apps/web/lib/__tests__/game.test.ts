import { Constants as CoreConstants } from "@skymo/core"
import { describe, expect, it } from "vitest"
import {
  createMockCard,
  createMockGame,
  createMockPlayer,
} from "@/tests/mocks/game-mock"
import {
  getBoardScaleClass,
  getConnectedPlayers,
  getCurrentScore,
  getCurrentUser,
  getCurrentWhoHasToPlay,
  getHost,
  getNextPlayerIndex,
  getOpponents,
  isCurrentUserTurn,
  isGameFinished,
  isGameLobby,
  isGamePlaying,
  isGameStopped,
  isHost,
  isLastTurnPickFromDiscardPile,
  isLastTurnPickFromDrawPile,
  isLastTurnReplace,
  isLastTurnThrow,
  isLastTurnTurn,
  isRoundLastLap,
  isRoundMain,
  isRoundOver,
  isRoundRevealCards,
  isTurnChooseAPile,
  isTurnReplaceACard,
  isTurnThrowOrReplace,
  isTurnTurnACard,
} from "../game"

describe("getCurrentUser", () => {
  it("should return the current player when found", () => {
    const players = [createMockPlayer("player1"), createMockPlayer("player2")]
    const result = getCurrentUser(players, "player1")
    expect(result).toEqual(players[0])
  })

  it("should return undefined when player not found", () => {
    const players = [createMockPlayer("player1"), createMockPlayer("player2")]
    const result = getCurrentUser(players, "player3")
    expect(result).toBeUndefined()
  })

  it("should return undefined when players is undefined", () => {
    const result = getCurrentUser(undefined, "player1")
    expect(result).toBeUndefined()
  })

  it("should return undefined when players array is empty", () => {
    const result = getCurrentUser([], "player1")
    expect(result).toBeUndefined()
  })
})

describe("getConnectedPlayers", () => {
  it("should return all connected players", () => {
    const players = [
      createMockPlayer("player1", CoreConstants.CONNECTION_STATUS.CONNECTED),
      createMockPlayer("player2", CoreConstants.CONNECTION_STATUS.CONNECTED),
      createMockPlayer("player3", CoreConstants.CONNECTION_STATUS.DISCONNECTED),
    ]
    const result = getConnectedPlayers(players)
    expect(result).toHaveLength(2)
    expect(result).toEqual([players[0], players[1]])
  })

  it("should return empty array when players is undefined", () => {
    const result = getConnectedPlayers(undefined)
    expect(result).toEqual([])
  })

  it("should return empty array when all players are disconnected", () => {
    const players = [
      createMockPlayer("player1", CoreConstants.CONNECTION_STATUS.DISCONNECTED),
      createMockPlayer("player2", CoreConstants.CONNECTION_STATUS.DISCONNECTED),
    ]
    const result = getConnectedPlayers(players)
    expect(result).toEqual([])
  })

  it("should handle players with LOST and LEAVE status", () => {
    const players = [
      createMockPlayer("player1", CoreConstants.CONNECTION_STATUS.CONNECTED),
      createMockPlayer("player2", CoreConstants.CONNECTION_STATUS.LOST),
      createMockPlayer("player3", CoreConstants.CONNECTION_STATUS.LEAVE),
    ]
    const result = getConnectedPlayers(players)
    expect(result).toHaveLength(3)
  })
})

describe("getOpponents", () => {
  it("should return correct arrangement for 2 players", () => {
    const players = [createMockPlayer("player1"), createMockPlayer("player2")]
    const result = getOpponents(players, "player1")
    expect(result).toEqual([[], [players[1]], []])
  })

  it("should return correct arrangement for 3 players", () => {
    const players = [
      createMockPlayer("player1"),
      createMockPlayer("player2"),
      createMockPlayer("player3"),
    ]
    const result = getOpponents(players, "player1")
    // With 3 players, player1's opponents are player2 and player3 (2 opponents)
    // According to the logic, when there are <= 2 opponents, they go in the middle
    expect(result).toEqual([[], [players[1], players[2]], []])
  })

  it("should return correct arrangement for 4 players", () => {
    const players = [
      createMockPlayer("player1"),
      createMockPlayer("player2"),
      createMockPlayer("player3"),
      createMockPlayer("player4"),
    ]
    const result = getOpponents(players, "player1")
    expect(result).toEqual([[players[1]], [players[2]], [players[3]]])
  })

  it("should return correct arrangement for 5 players", () => {
    const players = [
      createMockPlayer("player1"),
      createMockPlayer("player2"),
      createMockPlayer("player3"),
      createMockPlayer("player4"),
      createMockPlayer("player5"),
    ]
    const result = getOpponents(players, "player1")
    expect(result).toEqual([
      [players[1]],
      [players[2], players[3]],
      [players[4]],
    ])
  })

  it("should handle undefined players", () => {
    const result = getOpponents(undefined, "player1")
    expect(result).toEqual([[], [], []])
  })

  it("should filter out disconnected players", () => {
    const players = [
      createMockPlayer("player1"),
      createMockPlayer("player2", CoreConstants.CONNECTION_STATUS.DISCONNECTED),
      createMockPlayer("player3"),
    ]
    const result = getOpponents(players, "player1")
    expect(result).toEqual([[], [players[2]], []])
  })

  it("should handle when player is not in the list", () => {
    const players = [createMockPlayer("player1"), createMockPlayer("player2")]
    const result = getOpponents(players, "player3")
    // When the player is not in the list, playerIndex will be -1
    // slice(0) returns whole array, slice(0, -1) returns all but last
    // connectedOpponents = [...players.slice(0), ...players.slice(0, -1)]
    // = [player1, player2, player1]
    // Since length > 2, it goes to else branch:
    // firstOpponent = player1, lastOpponent = player1, middle = [player2]
    expect(result).toEqual([[players[0]], [players[1]], [players[0]]])
  })
})

describe("isCurrentUserTurn", () => {
  it("should return true when it's the player's turn in main phase", () => {
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
      turn: 0,
    })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(true)
  })

  it("should handle invalid turn index gracefully", () => {
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
      turn: 3, // Only 2 players exist (index 0 and 1)
      players: [createMockPlayer("player1"), createMockPlayer("player2")],
    })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should handle negative turn index", () => {
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
      turn: -1,
    })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should return false when it's not the player's turn", () => {
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
      turn: 1,
    })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should return true during reveal phase when player hasn't revealed enough cards", () => {
    const cards = [
      [createMockCard("1", 1, false), createMockCard("2", 2, false)],
      [createMockCard("3", 3, false), createMockCard("4", 4, false)],
    ]
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      cards,
      { hasRevealedCardCount: false },
    )
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.REVEAL_CARDS,
      players: [player],
    })
    expect(isCurrentUserTurn(game, player)).toBe(true)
  })

  it("should return false during reveal phase when player has revealed enough cards", () => {
    const cards = [
      [createMockCard("1", 1, true), createMockCard("2", 2, true)],
      [createMockCard("3", 3, false), createMockCard("4", 4, false)],
    ]
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      cards,
      { hasRevealedCardCount: true },
    )
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.REVEAL_CARDS,
      players: [player],
    })
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should return false when game is not playing", () => {
    const game = createMockGame({ status: CoreConstants.GAME_STATUS.LOBBY })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should return false when round is over", () => {
    const game = createMockGame({
      status: CoreConstants.GAME_STATUS.PLAYING,
      roundPhase: CoreConstants.ROUND_PHASE.OVER,
    })
    const player = game.players[0]
    expect(isCurrentUserTurn(game, player)).toBe(false)
  })

  it("should return false when player or game is undefined", () => {
    expect(isCurrentUserTurn()).toBe(false)
    expect(isCurrentUserTurn(createMockGame())).toBe(false)
    expect(isCurrentUserTurn(undefined, createMockPlayer("player1"))).toBe(
      false,
    )
  })
})

describe("getCurrentWhoHasToPlay", () => {
  it("should return the current player", () => {
    const game = createMockGame({ turn: 0 })
    const result = getCurrentWhoHasToPlay(game)
    expect(result).toEqual(game.players[0])
  })

  it("should return undefined when current player is not connected", () => {
    const game = createMockGame({
      turn: 1,
      players: [
        createMockPlayer("player1"),
        createMockPlayer(
          "player2",
          CoreConstants.CONNECTION_STATUS.DISCONNECTED,
        ),
      ],
    })
    const result = getCurrentWhoHasToPlay(game)
    expect(result).toBeUndefined()
  })

  it("should handle invalid turn index", () => {
    const game = createMockGame({ turn: 5 })
    const result = getCurrentWhoHasToPlay(game)
    expect(result).toBeUndefined()
  })

  it("should handle turn index equal to players length", () => {
    const game = createMockGame({
      turn: 2, // Equal to players.length
      players: [createMockPlayer("player1"), createMockPlayer("player2")],
    })
    const result = getCurrentWhoHasToPlay(game)
    expect(result).toBeUndefined()
  })

  it("should handle negative turn index", () => {
    const game = createMockGame({ turn: -1 })
    const result = getCurrentWhoHasToPlay(game)
    expect(result).toBeUndefined()
  })
})

describe("getNextPlayerIndex", () => {
  it("should return next player index in a 2-player game", () => {
    const game = createMockGame()
    const result = getNextPlayerIndex(game, game.players[0])
    expect(result).toBe(0)
  })

  it("should return -1 when no opponents", () => {
    const game = createMockGame({
      players: [createMockPlayer("player1")],
    })
    const result = getNextPlayerIndex(game, game.players[0])
    expect(result).toBe(-1)
  })

  it("should wrap around to first opponent", () => {
    const game = createMockGame({
      players: [
        createMockPlayer("player1"),
        createMockPlayer("player2"),
        createMockPlayer("player3"),
      ],
    })
    const result = getNextPlayerIndex(game, game.players[2])
    expect(result).toBe(0)
  })

  it("should skip disconnected players", () => {
    const game = createMockGame({
      players: [
        createMockPlayer("player1"),
        createMockPlayer(
          "player2",
          CoreConstants.CONNECTION_STATUS.DISCONNECTED,
        ),
        createMockPlayer("player3"),
      ],
    })
    const result = getNextPlayerIndex(game, game.players[0])
    expect(result).toBe(0) // Should return player3's index among opponents
  })
})

describe("isHost", () => {
  it("should return true when player is host", () => {
    const game = createMockGame({ hostId: "player1" })
    expect(isHost(game, "player1")).toBe(true)
  })

  it("should return false when player is not host", () => {
    const game = createMockGame({ hostId: "player1" })
    expect(isHost(game, "player2")).toBe(false)
  })

  it("should return false when game is undefined", () => {
    expect(isHost(undefined, "player1")).toBe(false)
  })

  it("should return false when playerId is undefined", () => {
    const game = createMockGame()
    expect(isHost(game)).toBe(false)
  })
})

describe("getHost", () => {
  it("should return the host player", () => {
    const game = createMockGame({ hostId: "player2" })
    const result = getHost(game)
    expect(result).toEqual(game.players[1])
  })

  it("should return undefined when game is undefined", () => {
    expect(getHost()).toBeUndefined()
  })

  it("should return undefined when host is not in players list", () => {
    const game = createMockGame({ hostId: "player3" })
    expect(getHost(game)).toBeUndefined()
  })
})

describe("getCurrentScore", () => {
  it("should calculate score correctly", () => {
    const cards = [
      [createMockCard("1", 5, true), createMockCard("2", 3, true)],
      [createMockCard("3", -2, true), createMockCard("4", 10, false)],
    ]
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      cards,
    )
    expect(getCurrentScore(player)).toBe(6) // 5 + 3 + (-2) = 6
  })

  it("should only count visible cards", () => {
    const cards = [
      [createMockCard("1", 5, false), createMockCard("2", 3, false)],
      [createMockCard("3", 10, false), createMockCard("4", 10, false)],
    ]
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      cards,
    )
    expect(getCurrentScore(player)).toBe(0)
  })

  it("should handle empty cards", () => {
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      [],
    )
    expect(getCurrentScore(player)).toBe(0)
  })

  it("should handle cards with undefined values", () => {
    const cards = [
      [createMockCard("1", undefined, true), createMockCard("2", 5, true)],
    ]
    const player = createMockPlayer(
      "player1",
      CoreConstants.CONNECTION_STATUS.CONNECTED,
      cards,
    )
    // Cards with undefined values should be ignored in the score calculation
    expect(getCurrentScore(player)).toBe(5)
  })
})

describe("Round phase checks", () => {
  it("isRoundRevealCards should work correctly", () => {
    expect(isRoundRevealCards(CoreConstants.ROUND_PHASE.REVEAL_CARDS)).toBe(
      true,
    )
    expect(isRoundRevealCards(CoreConstants.ROUND_PHASE.MAIN)).toBe(false)
    expect(isRoundRevealCards()).toBe(false)
  })

  it("isRoundMain should work correctly", () => {
    expect(isRoundMain(CoreConstants.ROUND_PHASE.MAIN)).toBe(true)
    expect(isRoundMain(CoreConstants.ROUND_PHASE.REVEAL_CARDS)).toBe(false)
    expect(isRoundMain()).toBe(false)
  })

  it("isRoundLastLap should work correctly", () => {
    expect(isRoundLastLap(CoreConstants.ROUND_PHASE.LAST_LAP)).toBe(true)
    expect(isRoundLastLap(CoreConstants.ROUND_PHASE.MAIN)).toBe(false)
    expect(isRoundLastLap()).toBe(false)
  })

  it("isRoundOver should work correctly", () => {
    expect(isRoundOver(CoreConstants.ROUND_PHASE.OVER)).toBe(true)
    expect(isRoundOver(CoreConstants.ROUND_PHASE.MAIN)).toBe(false)
    expect(isRoundOver()).toBe(false)
  })
})

describe("Game status checks", () => {
  it("isGameLobby should work correctly", () => {
    expect(isGameLobby(CoreConstants.GAME_STATUS.LOBBY)).toBe(true)
    expect(isGameLobby(CoreConstants.GAME_STATUS.PLAYING)).toBe(false)
    expect(isGameLobby()).toBe(false)
  })

  it("isGamePlaying should work correctly", () => {
    expect(isGamePlaying(CoreConstants.GAME_STATUS.PLAYING)).toBe(true)
    expect(isGamePlaying(CoreConstants.GAME_STATUS.LOBBY)).toBe(false)
    expect(isGamePlaying()).toBe(false)
  })

  it("isGameFinished should work correctly", () => {
    expect(isGameFinished(CoreConstants.GAME_STATUS.FINISHED)).toBe(true)
    expect(isGameFinished(CoreConstants.GAME_STATUS.PLAYING)).toBe(false)
    expect(isGameFinished()).toBe(false)
  })

  it("isGameStopped should work correctly", () => {
    expect(isGameStopped(CoreConstants.GAME_STATUS.STOPPED)).toBe(true)
    expect(isGameStopped(CoreConstants.GAME_STATUS.PLAYING)).toBe(false)
    expect(isGameStopped()).toBe(false)
  })
})

describe("Turn status checks", () => {
  it("isTurnChooseAPile should work correctly", () => {
    expect(isTurnChooseAPile(CoreConstants.TURN_STATUS.CHOOSE_A_PILE)).toBe(
      true,
    )
    expect(isTurnChooseAPile(CoreConstants.TURN_STATUS.THROW_OR_REPLACE)).toBe(
      false,
    )
    expect(isTurnChooseAPile()).toBe(false)
  })

  it("isTurnThrowOrReplace should work correctly", () => {
    expect(
      isTurnThrowOrReplace(CoreConstants.TURN_STATUS.THROW_OR_REPLACE),
    ).toBe(true)
    expect(isTurnThrowOrReplace(CoreConstants.TURN_STATUS.CHOOSE_A_PILE)).toBe(
      false,
    )
    expect(isTurnThrowOrReplace()).toBe(false)
  })

  it("isTurnTurnACard should work correctly", () => {
    expect(isTurnTurnACard(CoreConstants.TURN_STATUS.TURN_A_CARD)).toBe(true)
    expect(isTurnTurnACard(CoreConstants.TURN_STATUS.CHOOSE_A_PILE)).toBe(false)
    expect(isTurnTurnACard()).toBe(false)
  })

  it("isTurnReplaceACard should work correctly", () => {
    expect(isTurnReplaceACard(CoreConstants.TURN_STATUS.REPLACE_A_CARD)).toBe(
      true,
    )
    expect(isTurnReplaceACard(CoreConstants.TURN_STATUS.CHOOSE_A_PILE)).toBe(
      false,
    )
    expect(isTurnReplaceACard()).toBe(false)
  })
})

describe("Last turn status checks", () => {
  it("isLastTurnPickFromDrawPile should work correctly", () => {
    expect(
      isLastTurnPickFromDrawPile(
        CoreConstants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE,
      ),
    ).toBe(true)
    expect(
      isLastTurnPickFromDrawPile(CoreConstants.LAST_TURN_STATUS.THROW),
    ).toBe(false)
    expect(isLastTurnPickFromDrawPile()).toBe(false)
  })

  it("isLastTurnPickFromDiscardPile should work correctly", () => {
    expect(
      isLastTurnPickFromDiscardPile(
        CoreConstants.LAST_TURN_STATUS.PICK_FROM_DISCARD_PILE,
      ),
    ).toBe(true)
    expect(
      isLastTurnPickFromDiscardPile(CoreConstants.LAST_TURN_STATUS.THROW),
    ).toBe(false)
    expect(isLastTurnPickFromDiscardPile()).toBe(false)
  })

  it("isLastTurnThrow should work correctly", () => {
    expect(isLastTurnThrow(CoreConstants.LAST_TURN_STATUS.THROW)).toBe(true)
    expect(isLastTurnThrow(CoreConstants.LAST_TURN_STATUS.REPLACE)).toBe(false)
    expect(isLastTurnThrow()).toBe(false)
  })

  it("isLastTurnReplace should work correctly", () => {
    expect(isLastTurnReplace(CoreConstants.LAST_TURN_STATUS.REPLACE)).toBe(true)
    expect(isLastTurnReplace(CoreConstants.LAST_TURN_STATUS.THROW)).toBe(false)
    expect(isLastTurnReplace()).toBe(false)
  })

  it("isLastTurnTurn should work correctly", () => {
    expect(isLastTurnTurn(CoreConstants.LAST_TURN_STATUS.TURN)).toBe(true)
    expect(isLastTurnTurn(CoreConstants.LAST_TURN_STATUS.THROW)).toBe(false)
    expect(isLastTurnTurn()).toBe(false)
  })
})

describe("getBoardScaleClass", () => {
  it("should return scale-100 when it's player's turn", () => {
    expect(getBoardScaleClass(true, true)).toBe("scale-100")
    expect(getBoardScaleClass(true, false)).toBe("scale-100")
  })

  it("should return scale-100 when enlargeActivePlayerBoard is false", () => {
    expect(getBoardScaleClass(false, false)).toBe("scale-100")
  })

  it("should return scale-90 with translate for non-active players", () => {
    expect(getBoardScaleClass(false, true, false)).toBe(
      "scale-90 translate-y-2",
    )
    expect(getBoardScaleClass(false, true, true)).toBe(
      "scale-90 -translate-y-2",
    )
  })
})
