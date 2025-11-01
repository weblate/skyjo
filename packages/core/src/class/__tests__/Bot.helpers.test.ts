import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import { Bot } from "../Bot.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("Bot Helper Functions", () => {
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

    game = new Game({ hostId: botPlayer.id, settings: new Settings() })
    game.addPlayer(botPlayer)
    game.addPlayer(opponent)
  })

  describe("getBotPlayer", () => {
    it("should find the bot player in game", () => {
      const gameJson = game.toJson()
      const player = bot["getBotPlayer"](gameJson, botPlayer.id)

      expect(player).toBeDefined()
      expect(player.id).toBe(botPlayer.id)
    })

    it("should throw error if bot player not found", () => {
      const gameJson = game.toJson()

      expect(() => bot["getBotPlayer"](gameJson, "non-existent")).toThrow(
        "Bot player non-existent not found in game",
      )
    })
  })

  describe("getHiddenCardPositions", () => {
    it("should return all hidden card positions", () => {
      botPlayer.cards = [
        [new Card(1, false), new Card(2, true), new Card(3, false)],
        [new Card(4, false), new Card(5, false), new Card(6, true)],
      ]

      const playerJson = botPlayer.toJson()
      const positions = bot["getHiddenCardPositions"](playerJson)

      expect(positions).toHaveLength(4)
      expect(positions).toContainEqual({ row: 0, col: 0 })
      expect(positions).toContainEqual({ row: 2, col: 0 })
      expect(positions).toContainEqual({ row: 0, col: 1 })
      expect(positions).toContainEqual({ row: 1, col: 1 })
    })

    it("should return empty array if all cards visible", () => {
      botPlayer.cards = [
        [new Card(1, true), new Card(2, true), new Card(3, true)],
        [new Card(4, true), new Card(5, true), new Card(6, true)],
      ]

      const playerJson = botPlayer.toJson()
      const positions = bot["getHiddenCardPositions"](playerJson)

      expect(positions).toHaveLength(0)
    })

    it("should handle empty cards array", () => {
      botPlayer.cards = []

      const playerJson = botPlayer.toJson()
      const positions = bot["getHiddenCardPositions"](playerJson)

      expect(positions).toHaveLength(0)
    })
  })

  describe("calculateVisibleScore", () => {
    it("should calculate score only from visible cards", () => {
      botPlayer.cards = [
        [new Card(5, true), new Card(10, false), new Card(-2, true)],
        [new Card(3, true), new Card(7, false), new Card(12, true)],
      ]

      const playerJson = botPlayer.toJson()
      const score = bot["calculateVisibleScore"](playerJson)

      // 5 + (-2) + 3 + 12 = 18
      expect(score).toBe(18)
    })

    it("should return 0 if no cards are visible", () => {
      botPlayer.cards = [
        [new Card(5, false), new Card(10, false), new Card(-2, false)],
        [new Card(3, false), new Card(7, false), new Card(12, false)],
      ]

      const playerJson = botPlayer.toJson()
      const score = bot["calculateVisibleScore"](playerJson)

      expect(score).toBe(0)
    })

    it("should handle negative values correctly", () => {
      botPlayer.cards = [
        [new Card(-2, true), new Card(-1, true), new Card(0, true)],
      ]

      const playerJson = botPlayer.toJson()
      const score = bot["calculateVisibleScore"](playerJson)

      // -2 + (-1) + 0 = -3
      expect(score).toBe(-3)
    })
  })

  describe("getOpponentsLowestVisibleScore", () => {
    it("should return lowest opponent score", () => {
      const opponent2 = new Player(
        { name: "Opp2", avatar: Constants.AVATARS.BEE },
        "opp2-socket",
      )
      game.addPlayer(opponent2)

      // Bot: 10 points (not counted)
      botPlayer.cards = [[new Card(10, true)]]

      // Opponent 1: 5 points
      opponent.cards = [[new Card(5, true)]]

      // Opponent 2: 8 points
      opponent2.cards = [[new Card(8, true)]]

      const gameJson = game.toJson()
      const lowestScore = bot["getOpponentsLowestVisibleScore"](
        gameJson,
        botPlayer.id,
      )

      expect(lowestScore).toBe(5)
    })

    it("should return MAX_SAFE_INTEGER if no opponents", () => {
      const soloGame = new Game({ hostId: botPlayer.id })
      soloGame.addPlayer(botPlayer)

      const gameJson = soloGame.toJson()
      const lowestScore = bot["getOpponentsLowestVisibleScore"](
        gameJson,
        botPlayer.id,
      )

      expect(lowestScore).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe("countHiddenCards", () => {
    it("should count hidden cards", () => {
      botPlayer.cards = [
        [new Card(1, false), new Card(2, true), new Card(3, false)],
        [new Card(4, false), new Card(5, false), new Card(6, true)],
      ]

      const playerJson = botPlayer.toJson()
      const count = bot["countHiddenCards"](playerJson)

      expect(count).toBe(4)
    })

    it("should return 0 if all cards visible", () => {
      botPlayer.cards = [
        [new Card(1, true), new Card(2, true), new Card(3, true)],
      ]

      const playerJson = botPlayer.toJson()
      const count = bot["countHiddenCards"](playerJson)

      expect(count).toBe(0)
    })
  })

  describe("findColumnOpportunities", () => {
    it("should find column with 2 matching visible cards", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true

      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, false)],
        [new Card(1, true), new Card(2, true), new Card(3, false)],
      ]

      const playerJson = botPlayer.toJson()
      const opportunities = bot["findColumnOpportunities"](
        playerJson,
        settings.toJson(),
      )

      expect(opportunities).toHaveLength(1)
      expect(opportunities[0].colIndex).toBe(0)
      expect(opportunities[0].matchingValue).toBe(5)
      expect(opportunities[0].matchCount).toBe(2)
    })

    it("should return empty array if removeIdenticalColumn is false", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = false

      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, false)],
      ]

      const playerJson = botPlayer.toJson()
      const opportunities = bot["findColumnOpportunities"](
        playerJson,
        settings.toJson(),
      )

      expect(opportunities).toHaveLength(0)
    })

    it("should not find opportunities if no visible cards match", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true

      botPlayer.cards = [
        [new Card(1, true), new Card(2, true), new Card(10, false)],
      ]

      const playerJson = botPlayer.toJson()
      const opportunities = bot["findColumnOpportunities"](
        playerJson,
        settings.toJson(),
      )

      expect(opportunities).toHaveLength(0)
    })

    it("should not find opportunities if no hidden cards in column", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true

      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(5, true)],
      ]

      const playerJson = botPlayer.toJson()
      const opportunities = bot["findColumnOpportunities"](
        playerJson,
        settings.toJson(),
      )

      expect(opportunities).toHaveLength(0)
    })

    it("should find multiple column opportunities", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true

      botPlayer.cards = [
        [new Card(3, true), new Card(3, true), new Card(10, false)],
        [new Card(7, true), new Card(7, true), new Card(2, false)],
      ]

      const playerJson = botPlayer.toJson()
      const opportunities = bot["findColumnOpportunities"](
        playerJson,
        settings.toJson(),
      )

      expect(opportunities).toHaveLength(2)
    })
  })

  describe("evaluateReplacement", () => {
    it("should prefer replacing high card with low card", () => {
      const settings = new Settings()
      botPlayer.cards = [
        [new Card(10, true), new Card(5, true), new Card(2, true)],
      ]

      const playerJson = botPlayer.toJson()
      const gameJson = game.toJson()

      const scorePos0 = bot["evaluateReplacement"](
        gameJson,
        playerJson,
        1,
        { row: 0, col: 0 },
        settings.toJson(),
      )
      const scorePos1 = bot["evaluateReplacement"](
        gameJson,
        playerJson,
        1,
        { row: 1, col: 0 },
        settings.toJson(),
      )

      // Replacing 10 with 1 (gain of 9) should score higher than replacing 5 with 1 (gain of 4)
      expect(scorePos0).toBeGreaterThan(scorePos1)
    })

    it("should give bonus for column completion", () => {
      const settings = new Settings()
      settings.removeIdenticalColumn = true

      botPlayer.cards = [
        [new Card(5, true), new Card(5, true), new Card(10, true)],
        [new Card(3, true), new Card(3, true), new Card(3, true)],
      ]

      const playerJson = botPlayer.toJson()
      const gameJson = game.toJson()

      // Replacing position [2,0] with 5 completes a column
      const scoreCompleteColumn = bot["evaluateReplacement"](
        gameJson,
        playerJson,
        5,
        { row: 2, col: 0 },
        settings.toJson(),
      )

      // Replacing position [0,1] with 5 doesn't complete column
      const scoreNoColumn = bot["evaluateReplacement"](
        gameJson,
        playerJson,
        5,
        { row: 0, col: 1 },
        settings.toJson(),
      )

      expect(scoreCompleteColumn).toBeGreaterThan(scoreNoColumn)
    })
  })
})
