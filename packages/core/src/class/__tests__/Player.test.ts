import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import type { GameRedisDb } from "../../types/game.js"
import { Card } from "../Card.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

let nbColumns: number
let nbRows: number

const cardPerColumn = 3
const cardPerRow = 4

const TEST_SOCKET_ID = "socketId123"

describe("Player", () => {
  let player: Player

  beforeEach(() => {
    player = new Player(
      { name: "name", avatar: Constants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    player.cards = [
      [new Card(0), new Card(0), new Card(0)],
      [new Card(0), new Card(4), new Card(6)],
      [new Card(0), new Card(7), new Card(3)],
      [new Card(0), new Card(-1), new Card(11)],
    ]

    nbColumns = player.cards.length
    nbRows = player.cards[0].length
  })

  //#region Player class
  it("should populate the class without cards", () => {
    const dbPlayer: GameRedisDb["players"][number] = {
      id: crypto.randomUUID(),
      name: "name",
      avatar: Constants.AVATARS.BEE,
      socketId: TEST_SOCKET_ID,
      connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
      hasPlayedLastTurn: false,
      afkCount: 0,
      consecutiveAfkCount: 0,
      turnStartTime: null,
      score: 10,
      scores: [5, 5],
      wantsReplay: true,
      userId: null,
      sessionId: crypto.randomUUID(),
      cards: [],
      forfeited: false,
      forfeitedAt: null,
    }

    const player = new Player().populate(dbPlayer)

    expect(player.name).toBe(dbPlayer.name)
    expect(player.socketId).toBe(dbPlayer.socketId)
    expect(player.avatar).toBe(dbPlayer.avatar)
    expect(player.score).toBe(dbPlayer.score)
    expect(player.wantsReplay).toBe(dbPlayer.wantsReplay)
    expect(player.cards).toStrictEqual(dbPlayer.cards)
    expect(player.hasPlayedLastTurn).toBe(dbPlayer.hasPlayedLastTurn)
  })

  it("should populate the class with cards", () => {
    const dbPlayer: GameRedisDb["players"][number] = {
      id: crypto.randomUUID(),
      name: "name",
      avatar: Constants.AVATARS.BEE,
      socketId: TEST_SOCKET_ID,
      connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
      hasPlayedLastTurn: false,
      afkCount: 0,
      consecutiveAfkCount: 0,
      turnStartTime: null,
      score: 10,
      scores: [5, 5],
      wantsReplay: true,
      userId: null,
      sessionId: crypto.randomUUID(),
      cards: [
        [new Card(0), new Card(1), new Card(2)],
        [new Card(3), new Card(4), new Card(5)],
        [new Card(6), new Card(7), new Card(8)],
      ],
      forfeited: false,
      forfeitedAt: null,
    }

    const player = new Player().populate(dbPlayer)

    expect(player.name).toBe(dbPlayer.name)
    expect(player.socketId).toBe(dbPlayer.socketId)
    expect(player.avatar).toBe(dbPlayer.avatar)
    expect(player.score).toBe(dbPlayer.score)
    expect(player.wantsReplay).toBe(dbPlayer.wantsReplay)
    expect(player.cards).toStrictEqual(dbPlayer.cards)
  })

  it("should toggle the replay", () => {
    expect(player.wantsReplay).toBeFalsy()
    player.toggleReplay()
    expect(player.wantsReplay).toBeTruthy()
    player.toggleReplay()
    expect(player.wantsReplay).toBeFalsy()
  })
  //#endregion

  describe("set cards", () => {
    it("should set cards with default settings", () => {
      player.setCards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], new Settings())

      expect(removeIdFromCards(player.cards)).toStrictEqual(
        removeIdFromCards([
          [new Card(1), new Card(2), new Card(3)],
          [new Card(4), new Card(5), new Card(6)],
          [new Card(7), new Card(8), new Card(9)],
          [new Card(10), new Card(11), new Card(12)],
        ]),
      )
    })

    it("should set cards with custom settings", () => {
      const settings = new Settings()
      settings.cardPerRow = 2
      settings.cardPerColumn = 2
      player.setCards([1, 2, 3, 4], settings)

      expect(removeIdFromCards(player.cards)).toStrictEqual(
        removeIdFromCards([
          [new Card(1), new Card(2)],
          [new Card(3), new Card(4)],
        ]),
      )
    })
  })

  it("should turn a card", () => {
    expect(player.cards[0][0].isVisible).toBeFalsy()

    player.turnCard(0, 0)

    expect(player.cards[0][0].isVisible).toBeTruthy()
  })

  it("should replace a card", () => {
    expect(player.cards[0][0].value).toBe(0)

    player.replaceCard(0, 0, 12)

    expect(player.cards[0][0].value).toBe(12)
  })

  it("should remove a column", () => {
    const columnIndex = 1
    const cards = deepCloneArray(player.cards)

    const column = player["removeColumn"](columnIndex)

    expect(removeIdFromCards(column)).toMatchObject(
      removeIdFromCards(cards[columnIndex]),
    )
  })

  it("should remove a row", () => {
    const rowIndex = 1

    deepCloneArray(player.cards)

    const row = player["removeRow"](rowIndex)

    expect(removeIdFromCards(row)).toMatchObject(
      removeIdFromCards([new Card(0), new Card(4), new Card(7), new Card(-1)]),
    )
  })

  describe("check revealed card count", () => {
    it("should return false if the count is different", () => {
      expect(player.checkRevealedCardCount(2)).toBeFalsy()

      player.turnCard(0, 0)

      expect(player.checkRevealedCardCount(2)).toBeFalsy()
    })

    it("should return true if the count is the same", () => {
      player.turnCard(0, 0)
      player.turnCard(0, 1)

      expect(player.checkRevealedCardCount(2)).toBeTruthy()
    })
  })

  describe("check columns and discard", () => {
    it("should remove a column if cards visible and all cards are the same", () => {
      player.turnAllCards()

      const cards = player.checkColumnsAndDiscard()

      expect(cards.length).toBe(cardPerColumn)
      expect(player.cards.length).toBe(nbColumns - 1)
    })

    it("should not remove a column if cards are not visible", () => {
      const cards = player.checkColumnsAndDiscard()

      expect(cards.length).toBe(0)
      expect(player.cards.length).toBe(nbColumns)
    })

    it("should not remove a column if cards are visible but different", () => {
      player.cards = [
        [new Card(2, true), new Card(1, true)],
        [new Card(3), new Card(2)],
        [new Card(3), new Card(1)],
        [new Card(3), new Card(1)],
      ]
      const cards = player.checkColumnsAndDiscard()

      expect(cards.length).toBe(0)
      expect(player.cards.length).toBe(nbColumns)
    })

    it("should not remove a column if there is only one row", () => {
      player.cards = [
        [new Card(1)],
        [new Card(2)],
        [new Card(3)],
        [new Card(4)],
      ]

      const cards = player.checkColumnsAndDiscard()

      expect(cards.length).toBe(0)
      expect(player.cards.length).toBe(nbColumns)
    })
  })

  describe("check rows and discard", () => {
    it("should remove a row if cards visible and all cards are the same", () => {
      player.turnAllCards()

      const cardsToDiscard = player.checkRowsAndDiscard()

      expect(cardsToDiscard.length).toBe(cardPerRow)

      for (const column of player.cards) {
        expect(column.length).toBe(nbRows - 1)
      }
    })

    it("should not remove a row if cards are not visible", () => {
      const cardsToDiscard = player.checkRowsAndDiscard()

      expect(cardsToDiscard.length).toBe(0)

      for (const column of player.cards) {
        expect(column.length).toBe(nbRows)
      }
    })

    it("should not remove a row if cards are visible but different", () => {
      player.cards = [
        [new Card(1, true), new Card(2)],
        [new Card(3, true), new Card(2)],
        [new Card(3, true), new Card(1)],
        [new Card(3, true), new Card(1)],
      ]
      const cards = player.checkRowsAndDiscard()

      expect(cards.length).toBe(0)
      expect(player.cards.length).toBe(nbColumns)
    })

    it("should not remove a row if there is only one column", () => {
      player.cards = [[new Card(1, true), new Card(1, true)]]

      const cards = player.checkRowsAndDiscard()

      expect(cards.length).toBe(0)
      expect(player.cards.length).toBe(1)
    })
  })

  describe("current score array", () => {
    it("should return an empty array as current score in an array if no cards are revealed", () => {
      expect(player.currentScoreArray()).toStrictEqual([])
    })

    it("should return the current score in an array", () => {
      expect(player.currentScoreArray()).toStrictEqual([])

      player.turnCard(0, 0)

      expect(player.currentScoreArray()).toStrictEqual([0])

      player.turnAllCards()

      expect(player.currentScoreArray()).toStrictEqual([
        0, 0, 0, 0, 4, 6, 0, 7, 3, 0, -1, 11,
      ])
    })

    it("should return the current score array", () => {
      expect(player.currentScore()).toBe(0)
    })
    it("should remove a row that doesn't exist", () => {
      const rowIndex = 3

      const cards = player.cards.map((row) => {
        return row.slice()
      })

      const row = player["removeRow"](rowIndex)

      expect(player.cards).toStrictEqual(cards)
      expect(row).toStrictEqual([])
    })
  })

  it("should get current score", () => {
    expect(player.currentScore()).toBe(0)

    player.turnCard(0, 0)

    expect(player.currentScore()).toBe(0)

    player.turnAllCards()

    expect(player.currentScore()).toBe(30)
  })

  it("should turn all cards", () => {
    for (const column of player.cards) {
      for (const card of column) {
        expect(card.isVisible).toBeFalsy()
      }
    }

    player.turnAllCards()

    for (const column of player.cards) {
      for (const card of column) {
        expect(card.isVisible).toBeTruthy()
      }
    }
  })

  it("should recalculate the score", () => {
    player.scores = []
    player.recalculateScore()

    expect(player.score).toBe(0)

    player.scores = [10, 20]
    player.recalculateScore()

    expect(player.score).toBe(30)
  })

  describe("final round score", () => {
    it("should calculate the final round score", () => {
      player.finalRoundScore()

      expect(player.scores).toStrictEqual([30])
      expect(player.score).toBe(30)
    })

    it("should calculate the final round score when disconnected", () => {
      player.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

      player.finalRoundScore()

      expect(player.scores).toStrictEqual(["-"])
      expect(player.score).toBe(0)
    })
  })

  it("should reset the player", () => {
    player.scores = [10, 20]
    player.score = 30
    player.wantsReplay = true
    player.reset()

    expect(player.cards).toStrictEqual([])
    expect(player.wantsReplay).toBeFalsy()
    expect(player.scores).toStrictEqual([])
    expect(player.score).toBe(0)
  })

  it("should reset the round game data", () => {
    player.scores = [10, 20]
    player.turnAllCards()
    player.finalRoundScore()

    player.resetRound()

    expect(player.scores).toStrictEqual([10, 20, 30])
    expect(player.score).toBe(60)
    expect(player.cards).toStrictEqual([])
  })

  describe("toJson", () => {
    it("should return json", () => {
      const playerToJson = player.toJson()

      expect(playerToJson).toStrictEqual({
        id: player.id,
        name: "name",
        socketId: TEST_SOCKET_ID,
        avatar: Constants.AVATARS.BEE,
        cards: player.cards.map((column) =>
          column.map((card) => card.toJson()),
        ),
        turnStartTime: null,
        score: 0,
        scores: [],
        wantsReplay: false,
        connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
        username: undefined,
        forfeited: false,
        forfeitedAt: null,
        hasRevealedCardCount: false,
      })
    })
  })

  describe("getFirstCardNotVisible", () => {
    it("should return the position of the first card that is not visible", () => {
      player.cards = [
        [new Card(1, true), new Card(2, false)],
        [new Card(3, true), new Card(4, true)],
      ]

      const result = player.getFirstCardNotVisible()

      expect(result).toEqual({ column: 0, row: 1 })
    })

    it("should return undefined if all cards are visible", () => {
      player.cards = [
        [new Card(1, true), new Card(2, true)],
        [new Card(3, true), new Card(4, true)],
      ]

      const result = player.getFirstCardNotVisible()

      expect(result).toBeUndefined()
    })
  })

  //#region function helpers
  function removeIdFromCards(cards: Card[] | Card[][]) {
    const flattenedCards = cards.flat()

    return flattenedCards.map((card) => {
      return {
        value: card.value,
        isVisible: card.isVisible,
      }
    })
  }

  function deepCloneArray<T extends any[][]>(array: T) {
    return array.map((row) => {
      return row.map((card) => {
        return new Card(card.value, card.isVisible)
      })
    })
  }
  //#endregion
})
