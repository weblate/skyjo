import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { GameRedisDb, GameToJson } from "@/types/game.js"
import {
  Constants,
  type GameStatus,
  type LastTurnStatus,
  type RoundPhase,
  type TurnStatus,
} from "../constants.js"
import { Card } from "./Card.js"
import {
  DefaultGameOperationManager,
  type GameOperationManagerInterface,
} from "./GameOperationManager.js"
import { Player } from "./Player.js"
import { Settings } from "./Settings.js"

interface GameInterface {
  id: string
  code: string
  status: GameStatus
  players: Player[]
  currentPlayerId: string
  hostId: string
  settings: Settings

  selectedCardValue: number | null
  firstToFinishPlayerId: string | null
  turnStatus: TurnStatus
  lastTurnStatus: LastTurnStatus
  roundPhase: RoundPhase

  bannedUserIds: number[]
  bannedGuestIds: string[]

  gameStartedAt: Date | null
  roundStartedAt: Date | null

  stateVersion: number
  createdAt: Date
  updatedAt: Date

  getGameDuration(): number
  getRoundDuration(): number
  getRoundWinner(roundIndex?: number): Player | null
}

export interface GameConstructorParams {
  hostId: string
  settings?: Settings
}

export class Game implements GameInterface {
  operationManager: GameOperationManagerInterface =
    new DefaultGameOperationManager()
  id: string = crypto.randomUUID()
  code: string = Math.random().toString(36).substring(2, 10)
  hostId: string
  settings: Settings
  status: GameStatus = Constants.GAME_STATUS.LOBBY
  players: Player[] = []
  currentPlayerId: string = ""
  discardPile: number[] = []
  drawPile: number[] = []

  selectedCardValue: number | null = null
  turnStatus: TurnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
  lastTurnStatus: LastTurnStatus = Constants.LAST_TURN_STATUS.TURN
  roundPhase: RoundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
  roundNumber: number = 1
  firstToFinishPlayerId: string | null = null

  bannedUserIds: number[] = []
  bannedGuestIds: string[] = []

  gameStartedAt: Date | null = null
  roundStartedAt: Date | null = null

  processingAfk: boolean = false

  createdAt: Date
  updatedAt: Date
  stateVersion: number = 0

  constructor({ hostId, settings = new Settings() }: GameConstructorParams) {
    this.hostId = hostId
    this.settings = settings

    const now = new Date()
    this.createdAt = now
    this.updatedAt = now
  }

  setOperationManager(operationManager: GameOperationManagerInterface) {
    this.operationManager = operationManager
  }

  populate(game: GameRedisDb) {
    this.id = game.id
    this.code = game.code
    this.status = game.status
    this.currentPlayerId = game.currentPlayerId
    this.discardPile = game.discardPile
    this.drawPile = game.drawPile

    this.selectedCardValue = game.selectedCardValue
    this.turnStatus = game.turnStatus
    this.lastTurnStatus = game.lastTurnStatus
    this.roundPhase = game.roundPhase
    this.roundNumber = game.roundNumber

    this.firstToFinishPlayerId = game.firstToFinishPlayerId

    this.bannedUserIds = game.bannedUserIds || []
    this.bannedGuestIds = game.bannedGuestIds || []

    this.gameStartedAt = game.gameStartedAt
      ? new Date(game.gameStartedAt)
      : null
    this.roundStartedAt = game.roundStartedAt
      ? new Date(game.roundStartedAt)
      : null

    this.stateVersion = game.stateVersion
    this.processingAfk = game.processingAfk
    this.createdAt = new Date(game.createdAt)
    this.updatedAt = new Date(game.updatedAt)

    this.players = game.players.map((player) => new Player().populate(player))

    this.settings.populate(game.settings)

    return this
  }

  getLastDiscardCardValue() {
    return this.discardPile[this.discardPile.length - 1]
  }

  getConnectedPlayers(playerIdsToExclude: string[] = []) {
    return this.players.filter(
      (player) =>
        player.connectionStatus !== Constants.CONNECTION_STATUS.DISCONNECTED &&
        !playerIdsToExclude?.includes(player.id),
    )
  }

  getCurrentPlayer() {
    return this.players.find((p) => p.id === this.currentPlayerId)
  }

  getPlayerById(playerId: string) {
    return this.players.find((player) => {
      return player.id === playerId
    })
  }

  getPlayerByUserId(userId: number) {
    return this.players.find((player) => {
      return player.userId === userId
    })
  }

  hasUserAlreadyJoined(userId?: number) {
    if (!userId) return false
    return this.getPlayerByUserId(userId) !== undefined
  }

  getRoundWinner(roundIndex?: number): Player | null {
    const scoreIndex = roundIndex ?? this.roundNumber - 1
    const connectedPlayers = this.getConnectedPlayers()

    if (connectedPlayers.length === 0) return null

    const winner = connectedPlayers.reduce(
      (lowest, player) => {
        const playerScore = player.scores[scoreIndex]
        const lowestScore = lowest?.scores[scoreIndex]

        // Handle "-" (disconnected player) scores
        if (playerScore === "-") return lowest
        if (!lowest || lowestScore === "-") return player

        // Extract numeric values from score objects or direct numbers
        const currentScore =
          typeof playerScore === "object" ? playerScore.score : playerScore
        const lowestScoreValue =
          typeof lowestScore === "object"
            ? lowestScore.score
            : (lowestScore ?? Number.POSITIVE_INFINITY)

        return currentScore < lowestScoreValue ? player : lowest
      },
      null as Player | null,
    )

    return winner
  }

  /**
   * Get game duration in milliseconds since game started
   * Returns 0 if game hasn't started yet
   */
  getGameDuration(): number {
    if (!this.gameStartedAt) return 0
    return Date.now() - this.gameStartedAt.getTime()
  }

  /**
   * Get current round duration in milliseconds
   * Returns 0 if no round is active
   */
  getRoundDuration(): number {
    if (!this.roundStartedAt) return 0
    return Date.now() - this.roundStartedAt.getTime()
  }

  addPlayer(player: Player) {
    if (this.isFull()) {
      throw new CError("Cannot add player, game is full", {
        code: ErrorConstants.ERROR.GAME_IS_FULL,
        level: "info",
        meta: {
          game: this.toJson(),
          gameCode: this.code,
          playerId: player.id,
        },
      })
    }

    this.players.push(player)
  }

  async setPlayerToLeave(player: Player) {
    this.handleHostTransfer(player)

    if (!this.isPlaying() && !this.isFinished()) {
      await this.disconnectPlayer(player)
    } else {
      player.connectionStatus = Constants.CONNECTION_STATUS.LEAVE

      if (this.isFinished() && this.shouldStartNewGame()) {
        await this.startNewGame()
      }
    }
  }

  async disconnectPlayer(player: Player) {
    player.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

    const socket = this.operationManager.getSocket(player.socketId)
    if (socket) {
      await this.operationManager.kickSocket(socket)
    }

    this.handleHostTransfer(player)

    if (this.isPlaying() && this.getCurrentPlayer()?.id === player.id) {
      await this.finishTurn({ wasAfk: false })
    }

    if (!this.isPlaying()) {
      this.players = this.players.filter((p) => p.id !== player.id)
    }

    if (
      this.isPlaying() &&
      this.isRoundRevealCards() &&
      this.haveAllPlayersRevealedCards()
    ) {
      await this.startRoundAfterInitialReveal()
    }

    if (this.shouldStopGame()) await this.stopGame()

    // Remove game if no more players and game is not playing
    const hasNoConnectedPlayers = this.getConnectedPlayers().length === 0
    const shouldRemove = hasNoConnectedPlayers && !this.isPlaying()
    if (shouldRemove) {
      await this.operationManager.removeGame(this.code)
    }
  }

  isHost(playerId: string) {
    return this.hostId === playerId
  }

  banPlayer(target: Player) {
    if (target.userId && !this.bannedUserIds.includes(target.userId)) {
      this.bannedUserIds.push(target.userId)
    }

    if (target.guestId && !this.bannedGuestIds.includes(target.guestId)) {
      this.bannedGuestIds.push(target.guestId)
    }
  }

  isPlayerBanned(player: Player) {
    if (player.userId && this.bannedUserIds.includes(player.userId)) return true

    if (player.guestId && this.bannedGuestIds.includes(player.guestId))
      return true

    return false
  }

  changeHost() {
    const players = this.getConnectedPlayers([this.hostId])
    if (players.length === 0) return

    this.hostId = players[0].id
  }

  private handleHostTransfer(player: Player) {
    if (this.isHost(player.id)) {
      // Skip host change if this is the last player in lobby - let Redis TTL handle cleanup
      const isLastPlayerInLobby = this.isInLobby() && this.players.length === 1
      if (!isLastPlayerInLobby) {
        this.changeHost()
      }
    }
  }

  isFull() {
    return this.getConnectedPlayers().length >= this.settings.maxPlayers
  }

  //#region status
  isInLobby() {
    return this.status === Constants.GAME_STATUS.LOBBY
  }

  isPlaying() {
    return this.status === Constants.GAME_STATUS.PLAYING
  }

  isFinished() {
    return this.status === Constants.GAME_STATUS.FINISHED
  }

  isStopped() {
    return this.status === Constants.GAME_STATUS.STOPPED
  }
  //#endregion

  //#region roundPhase
  isRoundRevealCards() {
    return this.roundPhase === Constants.ROUND_PHASE.REVEAL_CARDS
  }

  isRoundMain() {
    return this.roundPhase === Constants.ROUND_PHASE.MAIN
  }

  isRoundLastLap() {
    return this.roundPhase === Constants.ROUND_PHASE.LAST_LAP
  }

  isRoundOver() {
    return this.roundPhase === Constants.ROUND_PHASE.OVER
  }
  //#endregion

  checkTurn(playerId: string) {
    return this.currentPlayerId === playerId
  }

  hasMinPlayersConnected() {
    return (
      this.getConnectedPlayers().length >=
      Constants.DEFAULT_GAME_SETTINGS.MIN_PLAYERS
    )
  }

  async start() {
    if (
      this.getConnectedPlayers().length <
      Constants.DEFAULT_GAME_SETTINGS.MIN_PLAYERS
    ) {
      throw new CError(
        `Game cannot start with less than ${Constants.DEFAULT_GAME_SETTINGS.MIN_PLAYERS} players`,
        {
          code: ErrorConstants.ERROR.TOO_FEW_PLAYERS,
          level: "info",
          meta: {
            game: this.toJson(),
          },
        },
      )
    }

    await this.resetGame()
  }

  async revealCard({
    player,
    column,
    row,
    wasAfk = false,
  }: {
    player: Player
    column: number
    row: number
    wasAfk?: boolean
  }) {
    if (
      !this.isPlaying() ||
      !this.isRoundRevealCards() ||
      player.hasRevealedCardCount
    )
      return

    if (!wasAfk) {
      player.consecutiveAfkCount = 0
    }

    player.turnCard(column, row)

    if (player.checkRevealedCardCount(this.settings.initialTurnedCount)) {
      player.turnStartTime = null
      player.hasRevealedCardCount = true

      // Cancel individual player's AFK timer when they complete reveals
      await this.operationManager.cancelRevealCardsAfkTimer(
        this.code,
        player.id,
      )

      this.checkCardsToDiscard(player)

      if (this.haveAllPlayersRevealedCards())
        await this.startRoundAfterInitialReveal()
    }
  }

  drawCard() {
    if (this.drawPile.length === 0) this.reloadDrawPile()

    const cardValue = this.drawPile.shift()!
    this.selectedCardValue = cardValue

    this.turnStatus = Constants.TURN_STATUS.THROW_OR_REPLACE
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE
  }

  pickFromDiscard() {
    if (this.discardPile.length === 0) return
    const cardValue = this.discardPile.pop()!
    this.selectedCardValue = cardValue

    this.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.PICK_FROM_DISCARD_PILE
  }

  discardSelectedCard(value: number) {
    this.discardPile.push(value)
    this.selectedCardValue = null
  }

  discardCard(value: number) {
    this.discardSelectedCard(value)

    this.turnStatus = Constants.TURN_STATUS.TURN_A_CARD
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.THROW
  }

  async replaceCard({
    column,
    row,
    wasAfk,
  }: {
    column: number
    row: number
    wasAfk?: boolean
  }) {
    const player = this.getCurrentPlayer()
    if (!player) {
      throw new Error("No current player found for replaceCard")
    }

    const oldCardValue = player.cards[column][row].value
    player.replaceCard(column, row, this.selectedCardValue!)

    this.discardSelectedCard(oldCardValue)
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.REPLACE

    await this.finishTurn({ wasAfk })
  }

  async turnCard({
    player,
    column,
    row,
    wasAfk = true,
  }: {
    player: Player
    column: number
    row: number
    wasAfk?: boolean
  }) {
    player.turnCard(column, row)
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.TURN

    await this.finishTurn({ wasAfk })
  }

  async finishTurn({ wasAfk = false }: { wasAfk?: boolean }) {
    const currentPlayer = this.getCurrentPlayer()
    if (!currentPlayer) {
      throw new Error("No current player found for finishTurn")
    }

    currentPlayer.turnStartTime = null
    await this.operationManager.cancelPlayerAfkTimer(
      this.code,
      currentPlayer.id,
    )

    if (!wasAfk) currentPlayer.consecutiveAfkCount = 0

    await this.nextTurn()

    if (this.shouldStartNewRound()) {
      await this.operationManager.delayNewRound(
        this,
        // istanbul ignore next --@preserve
        async () => await this.startNewRound(),
        Constants.NEW_ROUND_DELAY,
      )
    } else {
      const newCurrentPlayer = this.getCurrentPlayer()

      if (newCurrentPlayer) {
        newCurrentPlayer.startTurn()

        await this.operationManager.startPlayerAfkTimer(
          this,
          newCurrentPlayer.id,
        )
      }
    }
  }

  async togglePlayerReplay(playerId: string) {
    const player = this.getPlayerById(playerId)
    if (!player) return

    player.toggleReplay()

    if (this.shouldStartNewGame()) await this.startNewGame()
  }

  toJson() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      players: this.players.map((player) => player.toJson()),
      currentPlayerId: this.currentPlayerId,
      selectedCardValue: this.selectedCardValue,
      roundPhase: this.roundPhase,
      turnStatus: this.turnStatus,
      lastDiscardCardValue: this.getLastDiscardCardValue(),
      lastTurnStatus: this.lastTurnStatus,
      settings: this.settings.toJson(),
      stateVersion: this.stateVersion,
      updatedAt: this.updatedAt,
    } satisfies GameToJson
  }

  serialize() {
    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      isFull: this.isFull(),
      status: this.status,
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        socketId: player.socketId,
        guestId: player.guestId ?? null,
        username: player.username ?? null,
        avatar: player.avatar,
        score: player.score,
        wantsReplay: player.wantsReplay,
        connectionStatus: player.connectionStatus,
        scores: player.scores,
        hasPlayedLastTurn: player.hasPlayedLastTurn,
        afkCount: player.afkCount,
        consecutiveAfkCount: player.consecutiveAfkCount,
        disconnectedAfkCount: player.disconnectedAfkCount,
        turnStartTime: player.turnStartTime,
        timeout: player.timeout,
        userId: player.userId ?? null,
        sessionId: player.getSessionId(),
        forfeited: player.forfeited,
        forfeitedAt: player.forfeitedAt,
        hasRevealedCardCount: player.hasRevealedCardCount,
        cards: player.cards.map((column) =>
          column.map((card) => ({
            id: card.id,
            value: card.value,
            isVisible: card.isVisible,
          })),
        ),
      })),
      currentPlayerId: this.currentPlayerId,
      discardPile: this.discardPile,
      drawPile: this.drawPile,
      settings: {
        isConfirmed: this.settings.isConfirmed,
        private: this.settings.private,
        maxPlayers: this.settings.maxPlayers,
        removeIdenticalColumn: this.settings.removeIdenticalColumn,
        removeIdenticalRow: this.settings.removeIdenticalRow,
        initialTurnedCount: this.settings.initialTurnedCount,
        cardPerRow: this.settings.cardPerRow,
        cardPerColumn: this.settings.cardPerColumn,
        scoreToEndGame: this.settings.scoreToEndGame,
        firstPlayerMultiplierPenalty:
          this.settings.firstPlayerMultiplierPenalty,
        firstPlayerPenaltyType: this.settings.firstPlayerPenaltyType,
        firstPlayerFlatPenalty: this.settings.firstPlayerFlatPenalty,
        showCurrentScore: this.settings.showCurrentScore,
        playerRearrangement: this.settings.playerRearrangement,
      },
      selectedCardValue: this.selectedCardValue,
      roundNumber: this.roundNumber,
      roundPhase: this.roundPhase,
      turnStatus: this.turnStatus,
      lastTurnStatus: this.lastTurnStatus,
      firstToFinishPlayerId: this.firstToFinishPlayerId,
      bannedUserIds: this.bannedUserIds,
      bannedGuestIds: this.bannedGuestIds,
      gameStartedAt: this.gameStartedAt,
      roundStartedAt: this.roundStartedAt,
      stateVersion: this.stateVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      processingAfk: this.processingAfk,
    } satisfies GameRedisDb
  }

  //#region private methods

  private shufflePlayers(): void {
    const connectedPlayers = this.getConnectedPlayers()

    // Skip shuffle if 2 or fewer connected players - no strategic benefit
    if (connectedPlayers.length <= 2) return

    // Get ORIGINAL indices of connected players in the main players array
    const connectedIndices = this.players
      .map((player, index) => ({ player, index }))
      .filter(
        ({ player }) =>
          player.connectionStatus !== Constants.CONNECTION_STATUS.DISCONNECTED,
      )
      .map(({ index }) => index)

    // Fisher-Yates shuffle algorithm for connected players only
    const playersToShuffle = [...connectedPlayers]
    for (let i = playersToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[playersToShuffle[i], playersToShuffle[j]] = [
        playersToShuffle[j],
        playersToShuffle[i],
      ]
    }

    // Place shuffled connected players back into their connected positions
    // Disconnected players remain in their original positions
    for (const [i, index] of connectedIndices.entries()) {
      this.players[index] = playersToShuffle[i]
    }
  }

  private shufflePile(pile: number[], times = 3): number[] {
    const shuffledArray = [...pile]

    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledArray[i], shuffledArray[j]] = [
        shuffledArray[j],
        shuffledArray[i],
      ]
    }

    return times > 0
      ? this.shufflePile(shuffledArray, times - 1)
      : shuffledArray
  }

  private initializeCardPiles() {
    const defaultCards: number[] = [
      ...new Array(5).fill(-2),
      ...new Array(10).fill(-1),
      ...new Array(15).fill(0),
      ...new Array(10).fill(1),
      ...new Array(10).fill(2),
      ...new Array(10).fill(3),
      ...new Array(10).fill(4),
      ...new Array(10).fill(5),
      ...new Array(10).fill(6),
      ...new Array(10).fill(7),
      ...new Array(10).fill(8),
      ...new Array(10).fill(9),
      ...new Array(10).fill(10),
      ...new Array(10).fill(11),
      ...new Array(10).fill(12),
    ]

    this.drawPile = this.shufflePile(defaultCards)
    this.discardPile = []
  }

  private resetGamePlayers() {
    const connectedPlayers = this.getConnectedPlayers()
    for (const player of connectedPlayers) {
      player.resetGame()
    }
  }

  private givePlayersCards() {
    const connectedPlayers = this.getConnectedPlayers()
    for (const player of connectedPlayers) {
      const cards = this.drawPile.splice(0, 12)
      player.setCards(cards, this.settings)
    }
  }

  private async initializeRound() {
    this.firstToFinishPlayerId = null
    this.selectedCardValue = null
    this.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.TURN
    this.status = Constants.GAME_STATUS.PLAYING

    this.roundStartedAt = new Date()

    this.initializeCardPiles()
    this.resetGamePlayers()

    this.givePlayersCards()
    // Turn first card from faceoff pile to discard pile
    this.discardPile.push(this.drawPile.shift()!)

    if (this.settings.initialTurnedCount === 0) {
      this.roundPhase = Constants.ROUND_PHASE.MAIN
      // Randomly select first player when no initial cards to turn
      // Skip starting the turn since finishTurn will immediately move to the next player
      const randomPlayer = this.selectFirstPlayerRandomly()
      await this.setCurrentPlayerAndStartTurn(randomPlayer, true)
      await this.finishTurn({ wasAfk: false })
    } else {
      this.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      // Set turnStartTime and start individual AFK timers for all connected players during reveal phase
      const revealStartTime = Date.now()
      const connectedPlayers = this.getConnectedPlayers()
      for (const player of connectedPlayers) {
        player.startTurn(revealStartTime)
        await this.operationManager.startRevealCardsAfkTimer(this, player.id)
      }
    }
  }

  private resetPlayers() {
    this.removeDisconnectedPlayers()

    const connectedPlayers = this.getConnectedPlayers()
    for (const player of connectedPlayers) {
      player.reset()
    }
  }

  private async resetGame() {
    this.roundNumber = 1
    this.resetPlayers()

    this.gameStartedAt = new Date()

    if (
      this.settings.playerRearrangement ===
      Constants.PLAYER_REARRANGEMENT.EVERY_GAME
    ) {
      this.shufflePlayers()
    }

    await this.initializeRound()
  }

  private reloadDrawPile() {
    const lastCardOfDiscardPile = this.discardPile.pop()!
    this.drawPile = this.shufflePile(this.discardPile)
    this.discardPile = [lastCardOfDiscardPile]
  }

  private selectFirstPlayerByScore(): Player | undefined {
    const playersScore = this.players.map((player, i) => {
      if (player.connectionStatus === Constants.CONNECTION_STATUS.DISCONNECTED)
        return undefined

      const arrayScore = player.currentScoreArray()

      return {
        arrayScore,
        index: i,
      }
    })

    // the player with the highest score will start. If there is a tie, the player who have the highest card will start
    const playerToStart = playersScore.reduce((a, b) => {
      if (!a) return b
      if (!b) return a

      const aSum = a.arrayScore.reduce((acc, cur) => acc + cur, 0)
      const bSum = b.arrayScore.reduce((acc, cur) => acc + cur, 0)

      if (aSum === bSum) {
        const aMax = Math.max(...a.arrayScore)
        const bMax = Math.max(...b.arrayScore)

        // if the max value is the same, we randomize the result
        if (aMax === bMax) {
          const random = Math.floor(Math.random() * 2)
          return random === 0 ? a : b
        }

        return aMax > bMax ? a : b
      }

      return aSum > bSum ? a : b
    }, undefined)

    return playerToStart ? this.players[playerToStart.index] : this.players[0]
  }

  private selectFirstPlayerRandomly(): Player | undefined {
    const connectedPlayers = this.getConnectedPlayers()
    if (connectedPlayers.length === 0) return undefined

    const randomIndex = Math.floor(Math.random() * connectedPlayers.length)
    return connectedPlayers[randomIndex]
  }

  private async setCurrentPlayerAndStartTurn(
    player: Player | undefined,
    skipStartTurn = false,
  ) {
    if (!player) return

    this.currentPlayerId = player.id
    const currentPlayer = this.getCurrentPlayer()

    if (currentPlayer && !skipStartTurn) {
      currentPlayer.startTurn()

      await this.operationManager.startPlayerAfkTimer(this, currentPlayer.id)
    }
  }

  private haveAllPlayersRevealedCards() {
    return this.getConnectedPlayers().every(
      (player) => player.hasRevealedCardCount,
    )
  }

  private async startRoundAfterInitialReveal() {
    // Guard against concurrent calls - only proceed if still in REVEAL_CARDS phase
    if (!this.isRoundRevealCards()) return

    // Cancel individual AFK timers for any players who haven't completed yet
    // (players who completed already had their timers cancelled in revealCard)
    const connectedPlayers = this.getConnectedPlayers()
    for (const player of connectedPlayers) {
      if (!player.hasRevealedCardCount) {
        await this.operationManager.cancelRevealCardsAfkTimer(
          this.code,
          player.id,
        )
      }
    }

    // Clear turnStartTime from all players as reveal phase ends
    for (const player of connectedPlayers) {
      player.turnStartTime = null
    }

    this.roundPhase = Constants.ROUND_PHASE.MAIN
    this.lastTurnStatus = Constants.LAST_TURN_STATUS.TURN
    this.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE

    const selectedPlayer = this.selectFirstPlayerByScore()
    await this.setCurrentPlayerAndStartTurn(selectedPlayer)
  }

  private checkCardsToDiscard(player: Player, maxDepth = 10) {
    if (maxDepth <= 0) return // Prevent infinite recursion

    let cardsToDiscard: Card[] = []

    if (this.settings.removeIdenticalColumn) {
      cardsToDiscard = player.checkColumnsAndDiscard()
    }
    if (this.settings.removeIdenticalRow) {
      cardsToDiscard = cardsToDiscard.concat(player.checkRowsAndDiscard())
    }

    if (cardsToDiscard.length > 0) {
      for (const card of cardsToDiscard) {
        this.discardSelectedCard(card.value)
      }

      this.checkCardsToDiscard(player, maxDepth - 1)
    }
  }

  private hasPlayerFinished(player: Player) {
    return player.checkRevealedCardCount(player.cards.flat().length)
  }

  private shouldSetFirstPlayerToFinish(player: Player) {
    const hasPlayerFinished = this.hasPlayerFinished(player)

    return hasPlayerFinished && !this.firstToFinishPlayerId
  }

  private setFirstPlayerToFinish(player: Player) {
    this.firstToFinishPlayerId = player.id
    this.roundPhase = Constants.ROUND_PHASE.LAST_LAP
  }

  private getNextPlayerId(): string {
    // Find current player index
    const currentIndex = this.players.findIndex(
      (p) => p.id === this.currentPlayerId,
    )

    // If current player not found, randomize the first player
    if (currentIndex === -1) {
      const randomPlayer =
        this.players[Math.floor(Math.random() * this.players.length)] ??
        this.players[0]

      return randomPlayer.id
    }

    // Find next connected player
    let nextIndex = (currentIndex + 1) % this.players.length
    const startIndex = nextIndex

    // Loop through players to find next connected one
    while (
      this.players[nextIndex].connectionStatus ===
      Constants.CONNECTION_STATUS.DISCONNECTED
    ) {
      nextIndex = (nextIndex + 1) % this.players.length

      // If we've checked all players and looped back to where we started, break
      if (nextIndex === startIndex) break
    }

    return this.players[nextIndex]?.id ?? ""
  }

  private removeDisconnectedPlayers() {
    this.players = this.players.filter(
      (player) =>
        player.connectionStatus === Constants.CONNECTION_STATUS.CONNECTED,
    )
  }

  private checkFirstPlayerPenalty() {
    const lastScoreIndex = this.roundNumber - 1
    const firstToFinishPlayer = this.players.find(
      (player) => player.id === this.firstToFinishPlayerId,
    )
    if (!firstToFinishPlayer) return

    const firstToFinishPlayerPlayerScore =
      firstToFinishPlayer.scores[lastScoreIndex]

    if (typeof firstToFinishPlayerPlayerScore === "string") return

    let originalScore: number
    // score cannot be an object at this point but we keep the check for type safety
    if (typeof firstToFinishPlayerPlayerScore === "object") {
      originalScore = firstToFinishPlayerPlayerScore.score
    } else {
      originalScore = firstToFinishPlayerPlayerScore
    }

    const otherPlayersHaveLowerScore = this.getConnectedPlayers().some(
      (player) => {
        if (player.id === this.firstToFinishPlayerId) return false

        const playerScore = player.scores[lastScoreIndex]
        if (playerScore === "-") return false

        let playerScoreValue: number
        if (typeof playerScore === "object") {
          playerScoreValue = playerScore.score
        } else {
          playerScoreValue = playerScore
        }

        return playerScoreValue <= originalScore
      },
    )

    if (!otherPlayersHaveLowerScore) return

    let finalScore = originalScore
    let penaltyAmount = 0

    switch (this.settings.firstPlayerPenaltyType) {
      case Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY:
        finalScore = this.multiplierPenalty(finalScore)
        penaltyAmount = finalScore - originalScore
        break
      case Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_ONLY:
        finalScore = this.flatPenalty(finalScore)
        penaltyAmount = finalScore - originalScore
        break
      case Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_THEN_MULTIPLIER:
        finalScore = this.flatPenalty(finalScore)
        finalScore = this.multiplierPenalty(finalScore)
        penaltyAmount = finalScore - originalScore
        break
      case Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_THEN_FLAT:
        finalScore = this.multiplierPenalty(finalScore)
        finalScore = this.flatPenalty(finalScore)
        penaltyAmount = finalScore - originalScore
        break
    }

    firstToFinishPlayer.scores[lastScoreIndex] = {
      score: finalScore,
      penalty: penaltyAmount,
      originalScore: originalScore,
    }
    firstToFinishPlayer.recalculateScore()
  }

  private multiplierPenalty(score: number) {
    const isScorePositive = score > 0
    if (!isScorePositive) return score

    return score * this.settings.firstPlayerMultiplierPenalty
  }

  private flatPenalty(score: number) {
    return score + this.settings.firstPlayerFlatPenalty
  }

  private shouldStopGame() {
    return this.isPlaying() && !this.hasMinPlayersConnected()
  }

  private async stopGame() {
    this.status = Constants.GAME_STATUS.STOPPED
    await this.operationManager.storeGameIfNeeded(this.serialize())
  }

  private shouldEndGame() {
    return this.getConnectedPlayers().some(
      (player) => player.score >= this.settings.scoreToEndGame,
    )
  }

  private async endGame() {
    this.roundPhase = Constants.ROUND_PHASE.OVER
    this.status = Constants.GAME_STATUS.FINISHED

    await this.operationManager.storeGameIfNeeded(this.serialize())
  }

  private shouldEndRound() {
    const allPlayersHavePlayedLastTurn = this.getConnectedPlayers().every(
      (player) => player.hasPlayedLastTurn,
    )

    return allPlayersHavePlayedLastTurn
  }

  private async endRound() {
    for (const player of this.players) {
      player.turnAllCards()
      this.checkCardsToDiscard(player)
      player.finalRoundScore()
    }

    this.checkFirstPlayerPenalty()

    this.roundPhase = Constants.ROUND_PHASE.OVER

    if (this.shouldEndGame()) await this.endGame()
  }

  private async nextTurn() {
    const currentPlayer = this.getCurrentPlayer()
    if (!currentPlayer) {
      throw new Error("No current player found for nextTurn")
    }

    this.checkCardsToDiscard(currentPlayer)

    if (this.shouldSetFirstPlayerToFinish(currentPlayer)) {
      this.setFirstPlayerToFinish(currentPlayer)
    }

    if (this.isRoundLastLap()) {
      currentPlayer.hasPlayedLastTurn = true
      this.lastTurnStatus = Constants.LAST_TURN_STATUS.TURN
      currentPlayer.turnAllCards()
      this.checkCardsToDiscard(currentPlayer)

      if (this.shouldEndRound()) await this.endRound()
    }

    this.turnStatus = Constants.TURN_STATUS.CHOOSE_A_PILE
    this.currentPlayerId = this.getNextPlayerId()
  }

  private shouldStartNewRound() {
    return this.roundPhase === Constants.ROUND_PHASE.OVER && !this.isFinished()
  }

  private async startNewRound() {
    this.roundNumber++

    if (
      this.settings.playerRearrangement ===
      Constants.PLAYER_REARRANGEMENT.EVERY_ROUND
    ) {
      this.shufflePlayers()
    }

    await this.initializeRound()
  }

  private shouldStartNewGame() {
    const activePlayers = this.players.filter(
      (player) =>
        player.connectionStatus === Constants.CONNECTION_STATUS.CONNECTED,
    )

    return (
      activePlayers.length > 0 &&
      activePlayers.every((player) => player.wantsReplay)
    )
  }

  private async startNewGame() {
    for (const player of this.players) {
      await this.operationManager.cancelPlayerAfkTimer(this.code, player.id)
      await this.operationManager.cancelRevealCardsAfkTimer(
        this.code,
        player.id,
      )
    }

    await this.resetGame()
    this.status = Constants.GAME_STATUS.LOBBY
    this.stateVersion = 0
    this.createdAt = new Date()
    this.updatedAt = new Date()
    this.currentPlayerId = this.players[0]?.id ?? ""

    // allow host to change settings again if game is private
    this.settings.isConfirmed = !this.settings.private
  }

  //#endregion
}
