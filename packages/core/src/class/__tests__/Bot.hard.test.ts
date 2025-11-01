import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot - Hard Difficulty", () => {
  let game: Game
  let botPlayer: Player
  let opponent: Player
  let bot: Bot
  let settings: Settings

  beforeEach(() => {
    bot = new Bot("hard")
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

  describe("Initial Reveal Phase", () => {
    it("should prioritize strategic positions", () => {
      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
        [new Card(7), new Card(8), new Card(9)],
        [new Card(10), new Card(11), new Card(12)],
      ]

      const actions = bot.playInitialReveal(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("reveal")
      expect(actions[1].type).toBe("reveal")

      // Hard bot should have strategy in reveal positions
      expect(actions[0].position).toBeDefined()
      expect(actions[1].position).toBeDefined()
    })

    it("should spread across columns for better information", () => {
      game.settings.initialTurnedCount = 3

      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
        [new Card(7), new Card(8), new Card(9)],
        [new Card(10), new Card(11), new Card(12)],
      ]

      const actions = bot.playInitialReveal(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(3)

      // Verify all are reveal actions
      actions.forEach((action) => {
        expect(action.type).toBe("reveal")
      })
    })
  })

  describe("Low-Value Column Priority", () => {
    it("should take card to complete low-value column even if >4", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [3]

      // Column with two 3's
      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(10, false)],
        [new Card(5, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should prioritize low-value column completion", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 2

      // Two opportunities: 2's (low) and 8's (high)
      botPlayer.cards = [
        [new Card(2, true), new Card(2, true), new Card(10, false)],
        [new Card(8, true), new Card(8, true), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should complete the 2's column (lower value)
      expect(actions[0].position.col).toBe(0)
      expect(actions[0].position.row).toBe(2)
    })

    it("should give extra bonus to negative value columns", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = -1

      // Column with two -1's
      botPlayer.cards = [
        [new Card(-1, true), new Card(-1, true), new Card(10, false)],
        [new Card(5, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should definitely complete the negative column
      expect(actions[0].position.col).toBe(0)
    })
  })

  describe("Aggressive Optimization", () => {
    it("should replace highest visible card with good card", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 0

      botPlayer.cards = [
        [new Card(12, true), new Card(8, true), new Card(5, true)],
        [new Card(10, true), new Card(7, true), new Card(3, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should replace the 12 (highest card)
      expect(actions[0].position).toEqual({ row: 0, col: 0 })
    })

    it("should only take low-value cards from discard", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [1]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should NOT take high-value card unless for low-value column", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [10]

      // No column opportunity
      botPlayer.cards = [
        [new Card(5, true), new Card(3, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })
  })

  describe("Strategic Reveals", () => {
    it("should avoid breaking column opportunities when revealing", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 11

      // Column 0 has opportunity
      // Column 1 doesn't
      botPlayer.cards = [
        [new Card(2, true), new Card(2, true), new Card(10, false)],
        [new Card(5, true), new Card(8, true), new Card(7, false)],
      ]

      opponent.cards = [[new Card(20, true)]]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")

      // Should reveal from column without opportunity
      expect(actions[1].position.col).toBe(1)
    })
  })

  describe("Endgame Protection (Stricter)", () => {
    it("should handle last card carefully", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      // Bot has only 1 hidden, reasonable score
      botPlayer.cards = [
        [new Card(3, true), new Card(2, true), new Card(10, false)],
      ]

      // Opponent has higher score (bot winning)
      opponent.cards = [[new Card(15, true)]]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      // Should still reveal (only option)
      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
    })
  })

  describe("Complex Decision Making", () => {
    it("should evaluate multiple factors for best move", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 1

      // Multiple columns with different opportunities
      botPlayer.cards = [
        [new Card(1, true), new Card(1, true), new Card(12, true)], // Low column opportunity
        [new Card(7, true), new Card(7, true), new Card(10, true)], // High column opportunity
        [new Card(11, true), new Card(9, true), new Card(8, true)], // No opportunity
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should complete low-value column (1's)
      expect(actions[0].position.col).toBe(0)
      expect(actions[0].position.row).toBe(2)
    })

    it("should choose between completing column and replacing high card", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 0

      // Column 0: opportunity with 3's
      // Column 1: has a 12 that could be replaced
      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(5, true)],
        [new Card(12, true), new Card(8, true), new Card(7, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should replace the 12 with 0 (great improvement)
      expect(actions[0].position).toEqual({ row: 0, col: 1 })
    })
  })

  describe("Low-Value Column Strategy", () => {
    it("should take value 4 card for completing 4's column", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [4]

      botPlayer.cards = [
        [new Card(4, true), new Card(4, true), new Card(10, false)],
        [new Card(5, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should NOT take value 5 card for completing 5's column", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [5]

      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, false)],
        [new Card(3, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      // Should NOT take it (5 is not ≤4 and column is not low-value)
      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })
  })
})
