import { beforeEach, describe, expect, it, vi } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot Integration Tests", () => {
  let game: Game
  let botPlayer: Player
  let opponent: Player

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

    const settings = new Settings()
    settings.removeIdenticalColumn = true
    game = new Game({ hostId: botPlayer.id, settings })
    game.addPlayer(botPlayer)
    game.addPlayer(opponent)
  })

  describe("Complete Turn Sequences", () => {
    it("should complete a full turn from choosing pile to replacement", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [2]

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      // First action: choose pile
      const actions1 = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions1).toHaveLength(1)
      expect(actions1[0].type).toBe("pick-discard")

      // Simulate picking from discard
      game.selectedCardValue = 2
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD

      // No need for second playTurn - first action should include replaceAt
      expect(actions1[0]).toHaveProperty("replaceAt")
    })

    it("should handle draw, evaluate, and discard sequence", () => {
      const bot = new Bot("easy")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = [10]

      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      opponent.cards = [[new Card(20, true)]]

      // First: choose to draw
      const actions1 = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions1).toHaveLength(1)
      expect(actions1[0].type).toBe("pick-draw")

      // Simulate drawing a bad card
      game.selectedCardValue = 11
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE

      // Second: decide to discard and reveal
      const actions2 = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions2).toHaveLength(2)
      expect(actions2[0].type).toBe("discard")
      expect(actions2[1].type).toBe("turn")
    })
  })

  describe("Column Removal Scenarios", () => {
    it("should complete column when beneficial", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 4

      // Perfect column completion opportunity
      botPlayer.cards = [
        [new Card(4, true), new Card(4, true), new Card(4, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should choose to complete the column
      // (any position works since all are 4)
      expect(actions[0].position).toBeDefined()
    })

    it("should prioritize low-value column completion (hard)", () => {
      const bot = new Bot("hard")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 0

      botPlayer.cards = [
        [new Card(0, true), new Card(0, true), new Card(12, true)],
        [new Card(8, true), new Card(8, true), new Card(8, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")

      // Should complete 0's column (low value)
      expect(actions[0].position.col).toBe(0)
    })
  })

  describe("Multiple Opponents", () => {
    it("should evaluate against multiple opponents' scores", () => {
      const bot = new Bot("medium")

      const opponent2 = new Player(
        { name: "Opp2", avatar: Constants.AVATARS.BEE },
        "opp2-socket",
      )
      game.addPlayer(opponent2)

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 9

      // Bot is losing badly
      botPlayer.cards = [[new Card(20, true), new Card(15, false)]]

      // Opponents have low scores
      opponent.cards = [[new Card(5, true)]]
      opponent2.cards = [[new Card(3, true)]]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      // Should make a decision based on multiple opponents
      expect(actions.length).toBeGreaterThan(0)
      expect(actions[0].type).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle game with all visible cards", () => {
      const bot = new Bot("easy")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      botPlayer.cards = [
        [new Card(5, true), new Card(8, true), new Card(7, true)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
    })

    it("should handle error when selectedCardValue is null in THROW_OR_REPLACE", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = null

      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      expect(() => bot.playMove(game.toJson(), botPlayer.id)).toThrow(
        "selectedCardValue is null in THROW_OR_REPLACE state",
      )
    })

    it("should handle error when selectedCardValue is null in REPLACE_A_CARD", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.selectedCardValue = null

      botPlayer.cards = [
        [new Card(5, true), new Card(8, false), new Card(7, false)],
      ]

      expect(() => bot.playMove(game.toJson(), botPlayer.id)).toThrow(
        "selectedCardValue is null in REPLACE_A_CARD state",
      )
    })

    it("should handle error when lastDiscardCardValue is undefined when trying to pick discard", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = []
      game.getLastDiscardCardValue = vi.fn().mockReturnValue(undefined)

      // Force shouldTakeDiscardCard to return true (this shouldn't happen normally)
      botPlayer.cards = [
        [new Card(-2, true), new Card(8, false), new Card(7, false)],
      ]

      // Should not take discard if lastDiscardCardValue is undefined
      const actions = bot.playMove(game.toJson(), botPlayer.id)
      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })

    it("should handle multiple opponents with same visible score", () => {
      const bot = new Bot("medium")
      const opponent2 = new Player(
        { name: "Opp2", avatar: Constants.AVATARS.BEE },
        "opp2-socket",
      )
      game.addPlayer(opponent2)

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 5

      // All players have same visible score
      botPlayer.cards = [[new Card(10, true), new Card(8, false)]]
      opponent.cards = [[new Card(10, true), new Card(8, false)]]
      opponent2.cards = [[new Card(10, true), new Card(8, false)]]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      // Should still make a valid decision
      expect(actions.length).toBeGreaterThan(0)
      expect(actions[0].type).toBeDefined()
    })

    it("should handle single column scenario", () => {
      const bot = new Bot("medium")
      const smallSettings = new Settings()
      smallSettings.cardPerColumn = 1
      smallSettings.cardPerRow = 12
      smallSettings.removeIdenticalColumn = false
      game.settings = smallSettings

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 3

      botPlayer.cards = [
        [
          new Card(10, true),
          new Card(8, false),
          new Card(7, false),
          new Card(6, false),
          new Card(5, false),
          new Card(4, false),
          new Card(3, false),
          new Card(2, false),
          new Card(1, false),
          new Card(0, false),
          new Card(-1, false),
          new Card(-2, false),
        ],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
      expect(actions[0].position.col).toBe(0)
    })

    it("should handle game with only hidden cards", () => {
      const bot = new Bot("medium")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.TURN_A_CARD

      botPlayer.cards = [
        [new Card(5, false), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("turn")
      expect(actions[0].position).toBeDefined()
    })

    it("should handle empty discard pile", () => {
      const bot = new Bot("easy")

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
      game.discardPile = []

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("pick-draw")
    })

    it("should handle single column game", () => {
      const bot = new Bot("medium")

      const smallSettings = new Settings()
      smallSettings.cardPerColumn = 1
      smallSettings.cardPerRow = 3
      smallSettings.removeIdenticalColumn = false

      game.settings = smallSettings

      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)
      game.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
      game.selectedCardValue = 2

      botPlayer.cards = [
        [new Card(10, true), new Card(8, false), new Card(7, false)],
      ]

      const actions = bot.playMove(game.toJson(), botPlayer.id)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe("replace")
      expect(actions[0].position.col).toBe(0)
    })
  })

  describe("Initial Reveal Integration", () => {
    it("should reveal correct number of cards across difficulties", () => {
      const easyBot = new Bot("easy")
      const mediumBot = new Bot("medium")
      const hardBot = new Bot("hard")

      botPlayer.cards = [
        [new Card(1), new Card(2), new Card(3)],
        [new Card(4), new Card(5), new Card(6)],
        [new Card(7), new Card(8), new Card(9)],
        [new Card(10), new Card(11), new Card(12)],
      ]

      const easyActions = easyBot.playInitialReveal(game.toJson(), botPlayer.id)
      const mediumActions = mediumBot.playInitialReveal(
        game.toJson(),
        botPlayer.id,
      )
      const hardActions = hardBot.playInitialReveal(game.toJson(), botPlayer.id)

      expect(easyActions).toHaveLength(game.settings.initialTurnedCount)
      expect(mediumActions).toHaveLength(game.settings.initialTurnedCount)
      expect(hardActions).toHaveLength(game.settings.initialTurnedCount)

      // All should be reveal actions
      easyActions.forEach((a) => expect(a.type).toBe("reveal"))
      mediumActions.forEach((a) => expect(a.type).toBe("reveal"))
      hardActions.forEach((a) => expect(a.type).toBe("reveal"))
    })
  })

  describe("Full Game Simulation", () => {
    it("should make valid decisions throughout a simulated game", () => {
      const bot = new Bot("medium")

      // Set up a realistic mid-game state
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      game.turn = game.players.findIndex((p) => p.id === botPlayer.id)

      botPlayer.cards = [
        [new Card(5, true), new Card(3, true), new Card(10, false)],
        [new Card(7, true), new Card(2, false), new Card(8, false)],
        [new Card(12, true), new Card(1, true), new Card(6, false)],
        [new Card(9, true), new Card(4, true), new Card(11, false)],
      ]

      opponent.cards = [
        [new Card(8, true), new Card(6, true), new Card(5, false)],
        [new Card(3, true), new Card(7, true), new Card(9, false)],
        [new Card(11, true), new Card(2, true), new Card(10, false)],
        [new Card(4, true), new Card(12, true), new Card(1, false)],
      ]

      // Simulate several turns
      const scenarios = [
        {
          status: Constants.TURN_STATUS.CHOOSE_A_PILE,
          discardValue: 2,
        },
        {
          status: Constants.TURN_STATUS.THROW_OR_REPLACE,
          selectedCard: 5,
        },
        {
          status: Constants.TURN_STATUS.TURN_A_CARD,
          selectedCard: null,
        },
      ]

      scenarios.forEach((scenario) => {
        game.turnStatus = scenario.status
        if (scenario.discardValue !== undefined) {
          game.discardPile = [scenario.discardValue]
        }
        if (scenario.selectedCard !== null) {
          game.selectedCardValue = scenario.selectedCard || null
        }

        const actions = bot.playMove(game.toJson(), botPlayer.id)

        expect(actions.length).toBeGreaterThan(0)
        expect(actions[0].type).toBeDefined()

        // Verify all positions are valid if present
        actions.forEach((action) => {
          if ("position" in action) {
            expect(action.position.row).toBeGreaterThanOrEqual(0)
            expect(action.position.row).toBeLessThan(3)
            expect(action.position.col).toBeGreaterThanOrEqual(0)
            expect(action.position.col).toBeLessThan(4)
          }
          if ("replaceAt" in action) {
            expect(action.replaceAt.row).toBeGreaterThanOrEqual(0)
            expect(action.replaceAt.row).toBeLessThan(3)
            expect(action.replaceAt.col).toBeGreaterThanOrEqual(0)
            expect(action.replaceAt.col).toBeLessThan(4)
          }
        })
      })
    })
  })
})
