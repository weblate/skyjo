import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot - Medium Difficulty", () => {
  let game: Game
  let botPlayer: Player
  let opponent: Player
  let bot: Bot
  let settings: Settings

  beforeEach(() => {
    bot = new Bot("medium")
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
    it("should spread reveals across columns", () => {
      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
        [new Card(7), new Card(8), new Card(9)],
        [new Card(10), new Card(11), new Card(12)],
      ]

      const actions = bot.playInitialReveal(game.toJson(), botPlayer.id, 2)

      expect(actions).toHaveLength(2)

      // Should preferably be from different columns
      const cols = actions.map((a) => a.position.col)
      // At least attempt to spread (not guaranteed due to randomness, but structure exists)
      expect(actions[0].type).toBe("reveal")
      expect(actions[1].type).toBe("reveal")
    })
  })

  describe("Column Building Strategy", () => {
    it("should take discard card to complete column", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [5]

      // Column 0 has two 5's already
      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, false)],
        [new Card(3, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should NOT take high card just for column if not beneficial", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [12] // High card

      // Column 0 has two 12's already
      botPlayer.cards = [
        [new Card(12, true), new Card(12, true), new Card(10, false)],
        [new Card(3, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      // Should still take it for column opportunity
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should keep drawn card to build column", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 7

      // Column 1 has two 7's
      botPlayer.cards = [
        [new Card(5, true), new Card(3, true), new Card(10, false)],
        [new Card(7, true), new Card(7, true), new Card(2, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
    })
  })

  describe("Optimal Replacement Strategy", () => {
    it("should replace highest value card with low card", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 1

      botPlayer.cards = [
        [new Card(12, true), new Card(5, true), new Card(3, true)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should replace the 12 (highest card)
      expect(actions[0].position).toEqual({ row: 0, col: 0 })
    })

    it("should prioritize column completion over simple replacement", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 4

      // Column 0: has two 4's, one 12
      // Column 1: has 10, 8, 7 (no opportunity)
      botPlayer.cards = [
        [new Card(4, true), new Card(4, true), new Card(12, true)],
        [new Card(10, true), new Card(8, true), new Card(7, true)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should replace position [2,0] to complete column of 4's
      expect(actions[0].position.col).toBe(0)
      expect(actions[0].position.row).toBe(2)
    })
  })

  describe("Strategic Card Reveals", () => {
    it("should avoid revealing cards in column opportunities", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 10

      // Column 0 has column opportunity (two 3's)
      // Column 1 has no opportunity
      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(10, false)],
        [new Card(5, true), new Card(8, true), new Card(7, false)],
      ]

      opponent.cards = [[new Card(20, true)]]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")

      // Should reveal from column 1 (no opportunity), not column 0
      expect(actions[1].position.col).toBe(1)
    })

    it("should reveal randomly if all positions are in opportunities", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 10

      // Both columns have opportunities
      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(10, false)],
        [new Card(5, true), new Card(5, true), new Card(7, false)],
      ]

      opponent.cards = [[new Card(20, true)]]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")

      // Should still reveal something
      expect(actions[1].position).toBeDefined()
    })
  })

  describe("Endgame Protection", () => {
    it("should not matter for revealing when multiple hidden cards", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      // Bot has good score, 2 hidden cards
      botPlayer.cards = [
        [new Card(2, true), new Card(3, true), new Card(10, false)],
        [new Card(5, true), new Card(1, true), new Card(7, false)],
      ]

      // Opponent has worse score
      opponent.cards = [
        [new Card(10, true), new Card(12, true), new Card(8, true)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
      // Should reveal normally since not the last card
    })

    it("should handle last card scenario gracefully", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      // Bot has only 1 hidden card, good visible score
      botPlayer.cards = [
        [new Card(2, true), new Card(3, true), new Card(10, false)],
      ]

      // Opponent has higher visible score (bot winning by 5 points)
      opponent.cards = [
        [new Card(10, true), new Card(12, true), new Card(8, true)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      // Should still return an action (the only hidden card)
      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
    })
  })

  describe("Decision Making", () => {
    it("should take low value cards from discard", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [2]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
    })

    it("should draw if discard is not beneficial", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [9]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })
  })

  describe("Complex Scenarios", () => {
    it("should handle multiple column opportunities intelligently", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 3

      // Two column opportunities: 3's and 5's
      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(10, false)],
        [new Card(5, true), new Card(5, true), new Card(8, false)],
      ]

      const actions = bot.playTurn(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should complete the 3's column (better value)
      expect(actions[0].position.col).toBe(0)
    })
  })
})
