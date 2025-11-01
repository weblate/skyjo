import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot - Enhanced Intelligence", () => {
  let game: Game
  let botPlayer: Player
  let opponent: Player
  let settings: Settings

  beforeEach(() => {
    botPlayer = new Player(
      { name: "Bot", avatar: Constants.AVATARS.DOG },
      "bot-socket",
    )
    botPlayer.id = "bot-player"

    opponent = new Player(
      { name: "Opponent", avatar: Constants.AVATARS.CAT },
      "opp-socket",
    )
    opponent.id = "opponent-player"

    settings = new Settings()
    settings.removeIdenticalColumn = true
    game = new Game({ hostId: botPlayer.id, settings })
    game.addPlayer(botPlayer)
    game.addPlayer(opponent)
  })

  describe("Negative Value Handling", () => {
    describe("Easy Bot", () => {
      it("should always take negative values from discard pile", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [-2]

        botPlayer.cards = [
          [new Card(10, true), new Card(8, false), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard")
      })

      it("should always keep negative values when drawn", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = -1

        botPlayer.cards = [
          [new Card(5, true), new Card(8, false), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
      })

      it("should replace highest card with negative value", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = -2

        botPlayer.cards = [
          [new Card(12, true), new Card(8, true), new Card(3, true)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
        // Should replace the 12 (highest card)
        expect(actions[0].position).toEqual({ row: 0, col: 0 })
      })
    })

    describe("Medium Bot", () => {
      it("should always take negative values from discard", () => {
        const bot = new Bot("medium")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [-1]

        botPlayer.cards = [
          [new Card(10, true), new Card(8, false), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard")
      })
    })

    describe("Hard Bot", () => {
      it("should prioritize negative columns with huge bonus", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = -2

        // Two column opportunities: -2 and 4
        botPlayer.cards = [
          [new Card(-2, true), new Card(-2, true), new Card(10, false)],
          [new Card(4, true), new Card(4, true), new Card(8, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
        // Should complete the -2 column (better value)
        expect(actions[0].position.col).toBe(0)
        expect(actions[0].position.row).toBe(2)
      })

      it("should be very selective in endgame - only keep ≤2 when NOT a guaranteed keep", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 4 // Value 4 is not always kept (only ≤3 guaranteed)

        // Exactly 4 hidden cards left (endgame threshold), NO column opportunities with 4
        botPlayer.cards = [
          [new Card(2, true), new Card(1, true), new Card(5, false)],
          [new Card(3, true), new Card(0, true), new Card(6, true)],
          [new Card(1, true), new Card(2, true), new Card(7, false)],
          [new Card(5, true), new Card(1, true), new Card(8, false)],
          [new Card(2, true), new Card(0, true), new Card(9, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        // Should discard the 4 in endgame (only keep ≤2, no column opportunity)
        expect(actions).toHaveLength(2)
        expect(actions[0].type).toBe("discard")
        expect(actions[1].type).toBe("turn")
      })
    })
  })

  describe("Game State Awareness", () => {
    describe("Easy Bot", () => {
      it("should take ≤5 cards when losing badly", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [5]

        // Bot losing badly: 20 visible points, with 2+ hidden cards
        botPlayer.cards = [
          [new Card(10, true), new Card(10, true), new Card(7, false)],
          [new Card(5, true), new Card(6, true), new Card(8, false)],
        ]

        // Opponent winning: 3 visible points (bot losing by 17 points)
        opponent.cards = [[new Card(3, true), new Card(8, false)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard")
      })

      it("should NOT take ≤5 cards when winning", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [5]

        // Bot winning: 5 visible points
        botPlayer.cards = [[new Card(5, true), new Card(8, false)]]

        // Opponent losing: 20 visible points
        opponent.cards = [
          [new Card(10, true), new Card(10, true), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-draw")
      })

      it("should keep mediocre cards (≤7) when losing", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 6

        // Bot losing badly
        botPlayer.cards = [
          [new Card(15, true), new Card(12, true), new Card(7, false)],
        ]

        opponent.cards = [[new Card(5, true), new Card(8, false)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
      })
    })

    describe("Medium Bot", () => {
      it("should keep ≤6 cards in close game", () => {
        const bot = new Bot("medium")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 6

        // Close game (within 5 points)
        botPlayer.cards = [[new Card(10, true), new Card(8, false)]]
        opponent.cards = [[new Card(12, true), new Card(8, false)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
      })

      it("should NOT take high-value columns when not desperate", () => {
        const bot = new Bot("medium")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [9]

        // Column opportunity with 9's, but bot is winning
        botPlayer.cards = [
          [new Card(9, true), new Card(9, true), new Card(10, false)],
        ]
        opponent.cards = [[new Card(20, true), new Card(8, false)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-draw")
      })
    })

    describe("Hard Bot", () => {
      it("should be conservative when winning", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 4

        // Bot winning big, with more than 4 hidden cards
        botPlayer.cards = [
          [new Card(2, true), new Card(3, true), new Card(1, false)],
          [new Card(1, true), new Card(2, true), new Card(4, false)],
          [new Card(0, true), new Card(1, true), new Card(5, false)],
          [new Card(3, true), new Card(2, true), new Card(7, false)],
          [new Card(1, true), new Card(0, true), new Card(6, false)],
        ]
        opponent.cards = [[new Card(15, true), new Card(12, true)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace") // Should keep 4 when winning
      })

      it("should be aggressive when losing", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 5

        // Bot losing badly with more than 4 hidden cards
        botPlayer.cards = [
          [new Card(15, true), new Card(12, true), new Card(11, false)],
          [new Card(10, true), new Card(9, true), new Card(8, false)],
          [new Card(7, true), new Card(6, true), new Card(10, false)],
          [new Card(11, true), new Card(12, true), new Card(9, false)],
          [new Card(8, true), new Card(7, true), new Card(11, false)],
        ]
        opponent.cards = [[new Card(2, true), new Card(3, true)]]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace") // Should keep 5 when losing
      })
    })
  })

  describe("Initial Reveal Strategy", () => {
    describe("Easy Bot", () => {
      it("should prefer corners and edges for initial reveal", () => {
        const bot = new Bot("easy")
        botPlayer.cards = [
          [new Card(1), new Card(2), new Card(3)],
          [new Card(4), new Card(5), new Card(6)],
          [new Card(7), new Card(8), new Card(9)],
          [new Card(10), new Card(11), new Card(12)],
        ]

        // Run multiple times to check for corner/edge preference
        const cornerEdgeCount = { corners: 0, edges: 0, middle: 0 }
        const runs = 50

        for (let i = 0; i < runs; i++) {
          const actions = bot.playInitialReveal(game.toJson(), botPlayer.id, 2)

          actions.forEach((action) => {
            const { row, col } = action.position
            const isCorner =
              (row === 0 || row === 2) && (col === 0 || col === 3)
            const isEdge = row === 0 || row === 2 || col === 0 || col === 3

            if (isCorner) cornerEdgeCount.corners++
            else if (isEdge) cornerEdgeCount.edges++
            else cornerEdgeCount.middle++
          })
        }

        // At least 60% should be corners or edges (70% preference + some randomness)
        const totalCornerEdge = cornerEdgeCount.corners + cornerEdgeCount.edges
        const totalReveals = runs * 2
        expect(totalCornerEdge / totalReveals).toBeGreaterThan(0.5)
      })
    })
  })

  describe("Column Value Assessment", () => {
    describe("Hard Bot", () => {
      it("should only take ≤3 for non-column, non-endgame situations", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [4]

        // No column opportunity, more than 3 hidden cards
        botPlayer.cards = [
          [new Card(10, true), new Card(8, false), new Card(7, false)],
          [new Card(9, true), new Card(6, false), new Card(5, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-draw") // Should NOT take 4
      })

      it("should take 3 or less even without column", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [3]

        // No column opportunity
        botPlayer.cards = [
          [new Card(10, true), new Card(8, false), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard") // Should take ≤3 always
      })

      it("should take 4 for completing ≤4 column", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [4]

        // Column opportunity with 4's, more than 3 hidden cards
        botPlayer.cards = [
          [new Card(4, true), new Card(4, true), new Card(10, false)],
          [new Card(8, true), new Card(9, true), new Card(7, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard")
      })

      it("should be aggressive with value 4 in endgame", () => {
        const bot = new Bot("hard")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
        game.discardPile = [4]

        // Only 3 hidden cards left
        botPlayer.cards = [
          [new Card(10, true), new Card(8, true), new Card(7, false)],
          [new Card(9, true), new Card(6, true), new Card(5, false)],
          [new Card(11, true), new Card(7, true), new Card(4, false)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("pick-discard") // Should take 4 in endgame
      })
    })
  })

  describe("Replacement Intelligence", () => {
    describe("Easy Bot", () => {
      it("should replace highest visible card with good card", () => {
        const bot = new Bot("easy")
        game.roundPhase = Constants.ROUND_PHASE.MAIN
        game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
        game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
        game.selectedCardValue = 2

        botPlayer.cards = [
          [new Card(12, true), new Card(5, true), new Card(10, true)],
          [new Card(8, true), new Card(3, true), new Card(7, true)],
        ]

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions).toHaveLength(1)
        expect(actions[0].type).toBe("replace")
        // Should replace the 12 (highest card)
        expect(actions[0].position).toEqual({ row: 0, col: 0 })
      })
    })
  })
})
