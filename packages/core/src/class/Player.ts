import type {
  PlayerRedisDb,
  PlayerScore,
  PlayerToJson,
} from "@/types/player.js"
import type { CreatePlayer } from "@/validations/player.js"
import { type Avatar, type ConnectionStatus, Constants } from "../constants.js"
import { Card } from "./Card.js"
import { Settings } from "./Settings.js"

interface PlayerInterface {
  cards: Card[][]
  scores: PlayerScore[]
  readonly name: string
  readonly socketId: string
  readonly avatar: Avatar
  readonly userId?: number
  readonly username?: string
  readonly guestId?: string
  connectionStatus: ConnectionStatus
  afkCount: number
  consecutiveAfkCount: number
  disconnectedAfkCount: number
  disconnectionsThisTurn: number
  score: number
  wantsReplay: boolean
  hasPlayedLastTurn: boolean
  turnStartTime: number | null

  toggleReplay(): void
  setCards(cardsValue: number[], cardSettings: Settings): void
  turnCard(column: number, row: number): void
  replaceCard(column: number, row: number, value: number): void
  checkRevealedCardCount(count: number): boolean
  checkColumnsAndDiscard(): Card[]
  checkRowsAndDiscard(): Card[]
  currentScoreArray(): number[]
  turnAllCards(): void
  recalculateScore(): void
  finalRoundScore(): void
  toJson(): PlayerToJson
  getSessionId(): string
  rotateSession(): string
}
export class Player implements PlayerInterface {
  id: string = crypto.randomUUID()
  name: string
  socketId: string
  avatar: Avatar = Constants.AVATARS.BEE
  connectionStatus: ConnectionStatus = Constants.CONNECTION_STATUS.CONNECTED
  afkCount: number = 0
  consecutiveAfkCount: number = 0 // Consecutive timeouts
  disconnectedAfkCount: number = 0 // Consecutive AFK turns while disconnected
  disconnectionsThisTurn: number = 0 // Number of disconnections during current turn
  forfeited: boolean = false
  forfeitedAt: number | null = null
  cards: Card[][] = []
  score: number = 0
  scores: PlayerScore[] = []
  hasPlayedLastTurn = false
  wantsReplay: boolean = false
  turnStartTime: number | null = null
  userId?: number
  username?: string
  guestId?: string
  private sessionId: string = crypto.randomUUID()
  hasRevealedCardCount: boolean = false

  constructor(
    playerToCreate: CreatePlayer = {
      name: "",
      avatar: Constants.AVATARS.BEE,
    },
    socketId: string = "",
    userId?: number,
    username?: string | null,
    guestId?: string,
  ) {
    this.name = playerToCreate.name
    this.socketId = socketId
    this.avatar = playerToCreate.avatar
    this.userId = userId
    this.username = username ?? undefined
    this.guestId = guestId
  }

  populate(player: PlayerRedisDb) {
    this.id = player.id
    this.name = player.name
    this.avatar = player.avatar
    this.socketId = player.socketId
    this.username = player.username ?? undefined
    this.connectionStatus = player.connectionStatus
    this.score = player.score
    this.scores = player.scores
    this.wantsReplay = player.wantsReplay
    this.hasPlayedLastTurn = player.hasPlayedLastTurn
    this.afkCount = player.afkCount
    this.consecutiveAfkCount = player.consecutiveAfkCount
    this.disconnectedAfkCount = player.disconnectedAfkCount ?? 0
    this.disconnectionsThisTurn = player.disconnectionsThisTurn ?? 0
    this.turnStartTime = player.turnStartTime
    this.userId = player?.userId ?? undefined
    this.guestId = player?.guestId ?? undefined
    this.sessionId = player.sessionId
    this.forfeited = player.forfeited ?? false
    this.forfeitedAt = player.forfeitedAt ?? null
    this.hasRevealedCardCount = player.hasRevealedCardCount ?? false

    if (player.cards.length > 0) {
      this.cards = player.cards.map((column) =>
        column.map((card) => new Card(card.value, card.isVisible, card.id)),
      )
    }

    return this
  }

  getSessionId(): string {
    return this.sessionId
  }

  rotateSession(): string {
    this.sessionId = crypto.randomUUID()
    return this.sessionId
  }

  toggleReplay() {
    this.wantsReplay = !this.wantsReplay
  }

  setCards(cardsValue: number[], cardSettings: Settings) {
    this.cards = []

    for (let columnI = 0; columnI < cardSettings.cardPerColumn; columnI++) {
      this.cards.push([])
      for (let rowJ = 0; rowJ < cardSettings.cardPerRow; rowJ++) {
        const index = columnI * cardSettings.cardPerRow + rowJ
        this.cards[columnI].push(new Card(cardsValue[index]))
      }
    }
  }

  turnCard(column: number, row: number) {
    this.cards[column][row].turnVisible()
  }

  replaceCard(column: number, row: number, value: number) {
    const card = this.cards[column][row]

    card.turnVisible()
    card.value = value
  }

  checkRevealedCardCount(count: number) {
    const currentCount = this.cards
      .flat()
      .filter((card) => card.isVisible).length

    return currentCount === count
  }

  getFirstCardNotVisible() {
    for (let colIndex = 0; colIndex < this.cards.length; colIndex++) {
      for (
        let rowIndex = 0;
        rowIndex < this.cards[colIndex].length;
        rowIndex++
      ) {
        if (!this.cards[colIndex][rowIndex].isVisible) {
          return { column: colIndex, row: rowIndex }
        }
      }
    }
  }

  checkColumnsAndDiscard() {
    if (!this.cards[0] || this.cards[0].length <= 1) return []

    const cardsToDiscard: Card[] = []
    this.cards.forEach((column, index) => {
      const allCardsAreTheSameAndVisible = column.every(
        (card) => card.value === column[0].value && card.isVisible,
      )

      if (allCardsAreTheSameAndVisible) {
        cardsToDiscard.push(...this.removeColumn(index))
      }
    })

    return cardsToDiscard
  }

  checkRowsAndDiscard() {
    if (this.cards.length <= 1) return []

    const cardsToDiscard: Card[] = []

    for (let rowIndex = 0; rowIndex < this.cards[0].length; rowIndex++) {
      const row = this.cards
        .map((column) => column.slice(rowIndex, rowIndex + 1))
        .flat()

      const allCardsAreTheSameAndVisible = row.every(
        (card) => card.value === row[0].value && card.isVisible,
      )

      if (allCardsAreTheSameAndVisible) {
        cardsToDiscard.push(...this.removeRow(rowIndex))
      }
    }

    return cardsToDiscard
  }

  currentScoreArray() {
    const currentScore: number[] = []

    this.cards.flat().forEach((card) => {
      if (card.isVisible) currentScore.push(card.value)
    })

    return currentScore
  }

  turnAllCards() {
    this.cards.forEach((column) => {
      column.forEach((card) => {
        card.turnVisible()
      })
    })
  }

  recalculateScore() {
    this.score = this.scores
      .filter((score) => score !== "-")
      .map((score) => (typeof score === "object" ? score.score : score))
      .reduce((a, b) => +a + +b, 0)
  }

  finalRoundScore() {
    let finalScore = 0

    if (this.connectionStatus === Constants.CONNECTION_STATUS.DISCONNECTED) {
      this.scores.push("-")
      return
    }

    this.cards.forEach((column) => {
      column.forEach((card) => {
        finalScore += card.value
      })
    })

    this.scores.push(finalScore)

    this.recalculateScore()
  }

  reset() {
    this.resetGame()
    this.wantsReplay = false
    this.scores = []
    this.score = 0
    this.afkCount = 0
    this.consecutiveAfkCount = 0
    this.disconnectedAfkCount = 0
    this.disconnectionsThisTurn = 0
  }

  resetGame() {
    this.cards = []
    this.hasPlayedLastTurn = false
    this.turnStartTime = null
    this.hasRevealedCardCount = false
  }

  startTurn(serverTimestamp?: number) {
    this.turnStartTime = serverTimestamp ?? Date.now()
  }

  toJson(): PlayerToJson {
    return {
      id: this.id,
      name: this.name,
      socketId: this.socketId,
      avatar: this.avatar,
      score: this.score,
      wantsReplay: this.wantsReplay,
      connectionStatus: this.connectionStatus,
      scores: this.scores,
      turnStartTime: this.turnStartTime,
      username: this.username,
      cards: this.cards.map((column) => column.map((card) => card.toJson())),
      forfeited: this.forfeited,
      forfeitedAt: this.forfeitedAt,
      hasRevealedCardCount: this.hasRevealedCardCount,
      disconnectionsThisTurn: this.disconnectionsThisTurn,
    }
  }

  //#region private methods
  private removeColumn(column: number) {
    const deletedColumn = this.cards.splice(column, 1)
    return deletedColumn[0]
  }

  private removeRow(row: number) {
    const deletedRow = this.cards.map((column) => column.splice(row, 1))
    return deletedRow.flat()
  }

  currentScore() {
    return this.currentScoreArray().reduce((a, b) => a + b, 0)
  }
  //#endregion
}
