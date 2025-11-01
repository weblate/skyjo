import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot - Easy Difficulty", () => {
  let game: Game
  let botPlayer: Player
  let opponent: Player
  let bot: Bot

  beforeEach(() => {
    bot = new Bot("easy")
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

    const settings = new Settings()
    game = new Game({ hostId: botPlayer.id, settings })
    game.addPlayer(botPlayer)
    game.addPlayer(opponent)
  })

  describe("Initial Reveal Phase", () => {
    it("should return reveal actions for initial phase", () => {
      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
        [new Card(7), new Card(8), new Card(9)],
        [new Card(10), new Card(11), new Card(12)],
      ]

      const actions = bot.playInitialReveal(game.toJson(), botPlayer.id, 2)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("reveal")
      expect(actions[1].type).toBe("reveal")
      expect(actions[0]).toHaveProperty("position")
      expect(actions[1]).toHaveProperty("position")
    })

    it("should reveal different positions", () => {
      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
      ]

      const actions = bot.playInitialReveal(game.toJson(), botPlayer.id, 2)

      expect(actions).toHaveLength(2)

      const pos1 = actions[0].position
      const pos2 = actions[1].position

      // Positions should be different
      expect(pos1.row !== pos2.row || pos1.col !== pos2.col).toBe(true)
    })
  })

  describe("Discard Pile Decision", () => {
    it("should take card from discard if value ≤4", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [3]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-discard")
      expect(actions[0]).toHaveProperty("replaceAt")
    })

    it("should NOT take card from discard if value >4", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [8]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })

    it("should NOT take from discard if only 1 hidden card left", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [2]

      // All visible except one
      botPlayer.cards = [
        [new Card(10, true), new Card(8, true), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })
  })

  describe("Draw Pile Decision", () => {
    it("should keep drawn card if ≤4", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 3

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
      expect(actions[0]).toHaveProperty("position")
    })

    it("should discard drawn card if >4 and bot not losing", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 10

      // Bot has 5 points visible
      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      // Opponent has 10 points visible (bot is winning)
      opponent.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")
    })

    it("should keep mediocre card if bot is losing", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 7 // Mediocre card

      // Bot has 15 points visible (losing)
      botPlayer.cards = [
        [new Card(15, true), new Card(8, false), new Card(7, false)],
      ]

      // Opponent has 5 points visible (bot is losing)
      opponent.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
    })

    it("should discard bad card even if losing", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 12 // Bad card

      // Bot has 15 points visible (losing)
      botPlayer.cards = [
        [new Card(15, true), new Card(8, false), new Card(7, false)],
      ]

      // Opponent has 5 points visible
      opponent.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")
    })
  })

  describe("Replacement Strategy", () => {
    it("should replace at a random position", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 2

      botPlayer.cards = [
        [new Card(10, true), new Card(12, true), new Card(11, true)],
        [new Card(9, true), new Card(8, true), new Card(7, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should pick any valid position
      const pos = actions[0].position
      expect(pos.row).toBeGreaterThanOrEqual(0)
      expect(pos.row).toBeLessThan(3)
      expect(pos.col).toBeGreaterThanOrEqual(0)
      expect(pos.col).toBeLessThan(2)
    })

    it("should not optimize for column building", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true
      game.settings = settings

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 5

      // Column 0 has two 5's - easy bot should not care
      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, false)],
        [new Card(3, true), new Card(7, true), new Card(2, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Position should be random, not necessarily completing the column
      // We can't test randomness perfectly, but we verify it doesn't error
      expect(actions[0].position).toBeDefined()
    })
  })

  describe("Turn Card Selection", () => {
    it("should reveal a random hidden card after discarding", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 10

      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      opponent.cards = [
        [new Card(20, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(2)
      expect(actions[0].type).toBe("discard")
      expect(actions[1].type).toBe("turn")

      // Should reveal one of the hidden cards
      const pos = actions[1].position
      expect([1, 2]).toContain(pos.row)
    })

    it("should handle TURN_A_CARD status", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
      expect(actions[0].position).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle when all cards are visible", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      botPlayer.cards = [
        [new Card(5, true), new Card(8, true), new Card(7, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
      // Should return a position even if all visible
      expect(actions[0].position).toBeDefined()
    })

    it("should handle REPLACE_A_CARD status from picking discard", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.selectedCardValue = 3

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
      expect(actions[0].position).toBeDefined()
    })
  })
})
