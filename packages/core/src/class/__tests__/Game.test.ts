import { Constants as ErrorConstants } from "@skymo/error"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  Constants,
  type LastTurnStatus,
  type TurnStatus,
} from "../../constants.js"
import type { GameRedisDb } from "../../types/game.js"
import { Card } from "../Card.js"
import { Game } from "../Game.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"
import "@skymo/error/test/expect-extend"
import {
  DefaultGameOperationManager,
  GameOperationManagerInterface,
} from "../GameOperationManager.js"

const TEST_SOCKET_ID = "socketId123"
const TOTAL_CARDS = 150
const CARDS_PER_PLAYER = 12

describe("Game", () => {
  let game: Game
  let player: Player
  let settings: Settings
  let opponent: Player
  let operationManager: GameOperationManagerInterface

  beforeEach(() => {
    vi.clearAllMocks()
    player = new Player(
      { name: "player1", avatar: Constants.AVATARS.BEE },
      TEST_SOCKET_ID,
      1,
      "username1",
    )
    settings = new Settings()
    game = new Game({ hostId: player.id, settings })
    operationManager = {
      updateGame: vi.fn(),
      removeGame: vi.fn(),
      startRevealCardsAfkTimer: vi.fn(),
      startPlayerAfkTimer: vi.fn(),
      cancelRevealCardsAfkTimer: vi.fn(),
      cancelPlayerAfkTimer: vi.fn(),
      getSocket: vi.fn(),
      kickSocket: vi.fn(),
      delayNewRound: vi.fn(),
      storeGameIfNeeded: vi.fn(),
    }
    game.setOperationManager(operationManager)
    game.addPlayer(player)

    opponent = new Player(
      { name: "opponent2", avatar: Constants.AVATARS.ELEPHANT },
      "socketId456",
    )
    game.addPlayer(opponent)
  })

  describe("setOperationManager", () => {
    it("should set the operation manager", () => {
      game.setOperationManager(new DefaultGameOperationManager())
      expect(game["operationManager"]).toBeDefined()
    })
  })

  describe("populate", () => {
    it("should populate the class without players", () => {
      const gameDb: GameRedisDb = {
        id: crypto.randomUUID(),
        code: "code",
        hostId: player.id,
        isFull: false,
        status: Constants.GAME_STATUS.LOBBY,
        turn: 0,
        turnStatus: Constants.TURN_STATUS.CHOOSE_A_PILE,
        lastTurnStatus: Constants.LAST_TURN_STATUS.TURN,
        roundPhase: Constants.ROUND_PHASE.REVEAL_CARDS,
        roundNumber: 1,
        discardPile: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        drawPile: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        selectedCardValue: null,
        firstToFinishPlayerId: null,
        bannedUserIds: [],
        bannedGuestIds: [],
        players: [],

        settings: {
          isConfirmed: false,
          maxPlayers: 8,
          private: false,
          removeIdenticalColumn: true,
          removeIdenticalRow: false,
          initialTurnedCount: 2,
          cardPerRow: 3,
          cardPerColumn: 4,
          scoreToEndGame: 100,
          firstPlayerMultiplierPenalty: 2,
          firstPlayerPenaltyType:
            Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
          firstPlayerFlatPenalty: 0,
          showCurrentScore: false,
          playerRearrangement: Constants.PLAYER_REARRANGEMENT.NEVER,
        },

        stateVersion: 0,
        processingAfk: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      game = new Game({ hostId: player.id })
      game.populate(gameDb)

      expect(game.id).toBe(gameDb.id)
      expect(game.code).toBe(gameDb.code)
      expect(game.status).toBe(gameDb.status)
      expect(game.turn).toBe(gameDb.turn)
      expect(game.hostId).toBe(gameDb.hostId)
      expect(structuredClone(game.settings)).toStrictEqual(gameDb.settings)
    })

    it("should populate the class with players", () => {
      const gameDb: GameRedisDb = {
        id: crypto.randomUUID(),
        hostId: player.id,
        isFull: false,
        code: "code",
        status: Constants.GAME_STATUS.LOBBY,
        turn: 0,
        turnStatus: Constants.TURN_STATUS.CHOOSE_A_PILE,
        lastTurnStatus: Constants.LAST_TURN_STATUS.TURN,
        roundPhase: Constants.ROUND_PHASE.REVEAL_CARDS,
        roundNumber: 1,
        discardPile: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        drawPile: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        selectedCardValue: null,
        firstToFinishPlayerId: null,
        bannedUserIds: [],
        bannedGuestIds: [],
        players: [
          {
            id: crypto.randomUUID(),
            name: "player1",
            userId: player.userId ?? null,
            avatar: Constants.AVATARS.BEE,
            socketId: TEST_SOCKET_ID,
            connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
            afkCount: 0,
            consecutiveAfkCount: 0,
            turnStartTime: Date.now(),
            score: 10,
            scores: [5, 5],
            wantsReplay: true,
            cards: [
              [new Card(0), new Card(1), new Card(2)],
              [new Card(3), new Card(4), new Card(5)],
              [new Card(6), new Card(7), new Card(8)],
            ],
            hasPlayedLastTurn: false,
            sessionId: crypto.randomUUID(),
            forfeited: false,
            forfeitedAt: null,
            hasRevealedCardCount: false,
            disconnectedAfkCount: 0,
            timeout: Constants.TURN_TIMEOUT.CONNECTED,
          },
        ],

        settings: {
          isConfirmed: true,
          private: true,
          maxPlayers: 8,
          removeIdenticalColumn: true,
          removeIdenticalRow: false,
          initialTurnedCount: 2,
          cardPerRow: 3,
          cardPerColumn: 4,
          scoreToEndGame: 100,
          firstPlayerMultiplierPenalty: 2,
          firstPlayerPenaltyType:
            Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
          firstPlayerFlatPenalty: 0,
          showCurrentScore: false,
          playerRearrangement: Constants.PLAYER_REARRANGEMENT.NEVER,
        },

        stateVersion: 0,
        processingAfk: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      game = new Game({ hostId: player.id })
      game.populate(gameDb)

      expect(game.id).toBe(gameDb.id)
      expect(game.code).toBe(gameDb.code)
      expect(game.status).toBe(gameDb.status)
      expect(game.turn).toBe(gameDb.turn)
      expect(game.hostId).toBe(gameDb.hostId)
      expect(structuredClone(game.settings)).toStrictEqual(gameDb.settings)
      expect(game.players.length).toBe(1)
      expect(game.players[0].name).toBe(gameDb.players[0].name)
      expect(game.players[0].socketId).toBe(gameDb.players[0].socketId)
      expect(game.players[0].avatar).toBe(gameDb.players[0].avatar)
      expect(game.players[0].score).toBe(gameDb.players[0].score)
      expect(game.players[0].wantsReplay).toBe(gameDb.players[0].wantsReplay)
      expect(game.players[0].cards).toStrictEqual(gameDb.players[0].cards)
      expect(game.players[0].turnStartTime).toStrictEqual(
        gameDb.players[0].turnStartTime,
      )
    })
  })

  describe("getLastDiscardCardValue", () => {
    it("should get the last discard card value", () => {
      game.discardPile.push(10)
      expect(game.getLastDiscardCardValue()).toBe(10)
    })
  })

  describe("getConnectedPlayers", () => {
    it("should get the connected players", () => {
      game.players[0].connectionStatus =
        Constants.CONNECTION_STATUS.DISCONNECTED

      expect(game.getConnectedPlayers()).toStrictEqual([game.players[1]])
    })
  })

  describe("getCurrentPlayer", () => {
    it("should get the current player", () => {
      expect(game.getCurrentPlayer()).toBe(game.players[0])
    })
  })

  describe("getPlayerById", () => {
    it("should get player", () => {
      expect(game.getPlayerById(player.id)).toBe(player)
      expect(game.getPlayerById(opponent.id)).toBe(opponent)
    })
  })

  describe("addPlayer", () => {
    it("should add player", () => {
      settings.maxPlayers = 3
      const newPlayer = new Player(
        { name: "player3", avatar: Constants.AVATARS.TURTLE },
        "socketId789",
      )

      expect(() => game.addPlayer(newPlayer)).not.toThrow()
      expect(game.players).toHaveLength(3)
    })

    it("should not add player if max players is reached", () => {
      settings.maxPlayers = 2
      const newPlayer = new Player(
        { name: "player3", avatar: Constants.AVATARS.TURTLE },
        "socketId789",
      )

      expect(() => game.addPlayer(newPlayer)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.GAME_IS_FULL,
      )
      expect(game.players).toHaveLength(2)
    })
  })

  describe("setPlayerToLeave", () => {
    it("should set player connection status to leave when game is playing", async () => {
      // Set game status to PLAYING so disconnectPlayer is not called
      game.status = Constants.GAME_STATUS.PLAYING

      await game.setPlayerToLeave(player)
      expect(player.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)
    })

    it("should disconnect player if game is not playing", async () => {
      game.status = Constants.GAME_STATUS.LOBBY
      const spy = vi.spyOn(game, "disconnectPlayer")

      await game.setPlayerToLeave(player)

      expect(spy).toHaveBeenCalledWith(player)
      spy.mockRestore()
    })

    it("should not disconnect player if game is playing", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      const spy = vi.spyOn(game, "disconnectPlayer")

      await game.setPlayerToLeave(player)

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it("should set DISCONNECTED status when leaving in lobby", async () => {
      game.status = Constants.GAME_STATUS.LOBBY

      await game.setPlayerToLeave(player)

      // disconnectPlayer sets the status to DISCONNECTED
      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.DISCONNECTED,
      )
    })

    it("should only set LEAVE status when leaving during gameplay", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      player.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED

      await game.setPlayerToLeave(player)

      // Should only be LEAVE, not DISCONNECTED
      expect(player.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)
    })

    it("should allow player to reconnect after leaving during game", async () => {
      // Simulate player leaving during game
      game.status = Constants.GAME_STATUS.PLAYING
      player.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED

      await game.setPlayerToLeave(player)
      expect(player.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)

      // Simulate reconnection - status should update properly
      player.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED
      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.CONNECTED,
      )
    })

    it("should not have LEAVE status persist after recovery", async () => {
      // Edge case: Player leaves, then recovers connection
      game.status = Constants.GAME_STATUS.PLAYING

      // Player leaves
      await game.setPlayerToLeave(player)
      expect(player.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)

      // Player recovers (simulating what happens in onRecover)
      player.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED

      // Status should be CONNECTED, not LEAVE
      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.CONNECTED,
      )
      expect(player.connectionStatus).not.toBe(
        Constants.CONNECTION_STATUS.LEAVE,
      )
    })
  })

  describe("isHost", () => {
    it("should check if the player is host", () => {
      expect(game.isHost(player.id)).toBeTruthy()
      expect(game.isHost(opponent.id)).toBeFalsy()
    })
  })

  describe("changeHost", () => {
    it("should not change host if there is no connected players", () => {
      for (const player of game.players) {
        player.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
      }

      game.changeHost()
      expect(game.hostId).toBe(player.id)
    })

    it("should change host", () => {
      game.changeHost()
      expect(game.hostId).toBe(opponent.id)
    })

    it("should not change host if there is only one player connected (solo player)", () => {
      // Disconnect the opponent so only one player remains
      opponent.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
      const originalHostId = game.hostId

      game.changeHost()

      // Host should not change when there's only one player
      expect(game.hostId).toBe(originalHostId)
    })
  })

  describe("isFull", () => {
    it("should return false if the game is not full", () => {
      expect(game.isFull()).toBeFalsy()
    })

    it("should return true if the game is full", () => {
      game.settings.maxPlayers = 2

      expect(game.isFull()).toBeTruthy()
    })
  })

  describe("Status checker", () => {
    it("correctly identifies lobby status", () => {
      game.status = Constants.GAME_STATUS.LOBBY
      expect(game.isInLobby()).toBe(true)
      expect(game.isPlaying()).toBe(false)
      expect(game.isFinished()).toBe(false)
      expect(game.isStopped()).toBe(false)
    })

    it("correctly identifies playing status", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      expect(game.isInLobby()).toBe(false)
      expect(game.isPlaying()).toBe(true)
      expect(game.isFinished()).toBe(false)
      expect(game.isStopped()).toBe(false)
    })

    it("correctly identifies finished status", () => {
      game.status = Constants.GAME_STATUS.FINISHED
      expect(game.isInLobby()).toBe(false)
      expect(game.isPlaying()).toBe(false)
      expect(game.isFinished()).toBe(true)
      expect(game.isStopped()).toBe(false)
    })

    it("correctly identifies stopped status", () => {
      game.status = Constants.GAME_STATUS.STOPPED
      expect(game.isInLobby()).toBe(false)
      expect(game.isPlaying()).toBe(false)
      expect(game.isFinished()).toBe(false)
      expect(game.isStopped()).toBe(true)
    })
  })

  describe("Round phase checker", () => {
    it("correctly identifies turning cards phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      expect(game.isRoundRevealCards()).toBe(true)
      expect(game.isRoundMain()).toBe(false)
      expect(game.isRoundLastLap()).toBe(false)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies main phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundMain()).toBe(true)
      expect(game.isRoundLastLap()).toBe(false)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies last lap phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.LAST_LAP
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundMain()).toBe(false)
      expect(game.isRoundLastLap()).toBe(true)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies over phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.OVER
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundMain()).toBe(false)
      expect(game.isRoundLastLap()).toBe(false)
      expect(game.isRoundOver()).toBe(true)
    })
  })

  describe("checkTurn", () => {
    it("should check if it's player turn", () => {
      expect(game.checkTurn(player.id)).toBeTruthy()
      expect(game.checkTurn(opponent.id)).toBeFalsy()
    })
  })

  describe("hasMinPlayersConnected", () => {
    it("should return true if there are at least min players connected", () => {
      expect(game.hasMinPlayersConnected()).toBeTruthy()
    })

    it("should return false if there are less than min players connected", () => {
      game.players = game.players.filter((p) => p.id !== opponent.id)
      expect(game.hasMinPlayersConnected()).toBeFalsy()
    })
  })

  describe("start", () => {
    it("should not start the game if min players is not reached", async () => {
      game.players = game.players.filter((p) => p.id !== opponent.id)
      await expect(game.start()).toThrowCErrorWithCode(
        ErrorConstants.ERROR.TOO_FEW_PLAYERS,
      )
    })

    it("should start the game with default settings", async () => {
      await game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundRevealCards()).toBeTruthy()
    })

    it("should start the game and set the round status to playing if there is no card to turn at the beginning of the game", async () => {
      game.settings.initialTurnedCount = 0
      await game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundMain()).toBeTruthy()
    })
  })

  describe("revealCard", () => {
    beforeEach(() => {
      player.cards = [
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
      ]

      opponent.cards = [
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
        [new Card(10), new Card(10), new Card(10)],
      ]
    })

    it("should return early if the game is not playing", async () => {
      game.status = Constants.GAME_STATUS.LOBBY

      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })

      expect(player.cards[0][0].isVisible).toBe(false)
    })

    it("should return early if not in REVEAL_CARDS phase", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.MAIN

      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })

      expect(player.cards[0][0].isVisible).toBe(false)
    })

    it("should return early if player already revealed enough cards", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2

      player.cards[0][0].turnVisible()
      player.cards[0][1].turnVisible()
      player.hasRevealedCardCount = true

      await game.revealCard({
        player,
        column: 0,
        row: 2,
      })

      expect(player.cards[0][2].isVisible).toBe(false)
    })

    it("should reset consecutiveAfkCount when wasAfk is false", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      player.consecutiveAfkCount = 2

      await game.revealCard({
        player,
        column: 0,
        row: 0,
        wasAfk: false,
      })

      expect(player.consecutiveAfkCount).toBe(0)
      expect(player.cards[0][0].isVisible).toBe(true)
    })

    it("should not reset consecutiveAfkCount when wasAfk is true", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      player.consecutiveAfkCount = 2

      await game.revealCard({
        player,
        column: 0,
        row: 1,
        wasAfk: true,
      })

      expect(player.consecutiveAfkCount).toBe(2)
      expect(player.cards[0][1].isVisible).toBe(true)
    })

    it("should not start round after initial reveal if not all players revealed cards", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 1

      const startRoundSpy = vi.spyOn(
        game as any,
        "startRoundAfterInitialReveal",
      )

      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })

      expect(player.cards[0][0].isVisible).toBe(true)
      expect(startRoundSpy).not.toHaveBeenCalled()

      startRoundSpy.mockRestore()
    })

    it("should start round after initial reveal if all players revealed required cards", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 1

      const startRoundSpy = vi
        .spyOn(game as any, "startRoundAfterInitialReveal")
        .mockImplementation(async () => {})
      const haveAllPlayersRevealedSpy = vi
        .spyOn(game as any, "haveAllPlayersRevealedCards")
        .mockReturnValue(true)

      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })

      expect(player.cards[0][0].isVisible).toBe(true)
      expect(player.turnStartTime).toBe(null)
      expect(startRoundSpy).toHaveBeenCalled()

      startRoundSpy.mockRestore()
      haveAllPlayersRevealedSpy.mockRestore()
    })

    it("should reveal a 5 and then discard it because it's a column of 3 identical cards", async () => {
      game.settings.initialTurnedCount = 3
      await game.start()

      player.cards = [
        [new Card(5, false), new Card(5, true), new Card(5, true)],
        [new Card(1, false), new Card(2, false), new Card(3, false)],
        [new Card(4, false), new Card(6, false), new Card(7, false)],
        [new Card(8, false), new Card(9, false), new Card(10, false)],
      ]

      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })

      // 0 because the 3 cards are discarded
      expect(player.cards.flat().filter((card) => card.isVisible).length).toBe(
        0,
      )

      const nbColumns = player.cards.length
      expect(nbColumns).toBe(3)

      const nbRows = player.cards[0].length
      expect(nbRows).toBe(3)
    })

    it("should discard matching cards when revealing card completes a matching set", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = false

      // Set up player cards where revealing one card will complete a matching column
      // Create cards explicitly to ensure we can mutate them
      const card1 = new Card(5, false) // Hidden card that will be revealed
      const card2 = new Card(5, false) // Hidden card
      const card3 = new Card(5, true) // Already visible card (only 1 visible, so can reveal more)

      player.cards = [
        [card1, card2, card3], // Column 0: two hidden 5s, one visible 5
        [new Card(1, false), new Card(2, false), new Card(3, false)], // Column 1: different values
        [new Card(4, false), new Card(6, false), new Card(7, false)], // Column 2: different values
        [new Card(8, false), new Card(9, false), new Card(10, false)], // Column 3: different values
      ]

      // Verify initial state - only 1 card is visible (less than initialTurnedCount=2)
      const initialVisibleCount = player.cards
        .flat()
        .filter((card) => card.isVisible).length
      expect(initialVisibleCount).toBe(1)
      expect(player.cards[0][0].isVisible).toBe(false)

      // Helper function to check if column 0 cards match and are visible
      const checkColumn0Matching = () => {
        const allColumn0Visible = player.cards[0].every(
          (card) => card.isVisible,
        )
        const allColumn0Same = player.cards[0].every((card) => card.value === 5)
        return allColumn0Visible && allColumn0Same ? [card1, card2, card3] : []
      }

      // Mock the player's checkColumnsAndDiscard method
      const checkColumnsSpy = vi
        .spyOn(player, "checkColumnsAndDiscard")
        .mockImplementation(checkColumn0Matching)

      // Track discarded cards
      const discardedCards: number[] = []
      const discardCardMock = (value: number) => discardedCards.push(value)
      const discardCardSpy = vi
        .spyOn(game, "discardSelectedCard")
        .mockImplementation(discardCardMock)

      await game.revealCard({
        player,
        column: 0,
        row: 0, // Reveal the hidden card in column 0 - this is the second revealed card
      })

      // Verify the card was revealed
      expect(player.cards[0][0].isVisible).toBe(true)

      // Verify that checkColumnsAndDiscard was called
      expect(checkColumnsSpy).toHaveBeenCalled()

      // Clean up spies
      checkColumnsSpy.mockRestore()
      discardCardSpy.mockRestore()
    })

    it("should only check for discards after all required cards are revealed, not after each individual reveal", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2 // Need to reveal 2 cards
      game.settings.removeIdenticalColumn = true

      // Set up player cards where column 0 has matching values that should be discarded
      // but only after all initial cards are revealed
      player.cards = [
        [new Card(5, false), new Card(5, false), new Card(5, false)], // Column 0: all hidden 5s - will match when all revealed
        [new Card(1, false), new Card(2, false), new Card(3, false)], // Column 1: different values
        [new Card(4, false), new Card(6, false), new Card(7, false)], // Column 2: different values
        [new Card(8, false), new Card(9, false), new Card(10, false)], // Column 3: different values
      ]

      // Track when checkCardsToDiscard is called
      const checkCardsToDiscardCalls: number[] = []
      const originalCheckCardsToDiscard = (game as any).checkCardsToDiscard
      const checkCardsToDiscardSpy = vi
        .spyOn(game as any, "checkCardsToDiscard")
        // @ts-expect-error - mockImplementation is not typed correctly
        .mockImplementation((playerParam: Player) => {
          const visibleCount = playerParam.cards
            .flat()
            .filter((card) => card.isVisible).length
          checkCardsToDiscardCalls.push(visibleCount)

          // Call original method to actually check discards
          return originalCheckCardsToDiscard.call(game, playerParam)
        })

      // Mock haveAllPlayersRevealedCards to always return false until we're done testing
      const haveAllPlayersRevealedSpy = vi
        .spyOn(game as any, "haveAllPlayersRevealedCards")
        .mockReturnValue(false)

      // Reveal first card - should NOT trigger checkCardsToDiscard
      await game.revealCard({
        player,
        column: 0,
        row: 0,
      })
      expect(player.cards[0][0].isVisible).toBe(true)
      expect(checkCardsToDiscardCalls).toHaveLength(0) // Should not be called yet

      // Reveal second card (completes initial requirement) - should NOW trigger checkCardsToDiscard
      await game.revealCard({
        player,
        column: 0,
        row: 1,
      })
      expect(player.cards[0][1].isVisible).toBe(true)
      expect(checkCardsToDiscardCalls).toHaveLength(1) // Should be called exactly once
      expect(checkCardsToDiscardCalls[0]).toBe(2) // Called when player had 2 visible cards

      // Verify that player.turnStartTime was set to null (indicating completion)
      expect(player.turnStartTime).toBe(null)

      // Clean up spies
      checkCardsToDiscardSpy.mockRestore()
      haveAllPlayersRevealedSpy.mockRestore()
    })
  })

  describe("drawCard", () => {
    it("should draw card", async () => {
      await game.start()

      expect(game.selectedCardValue).toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )

      game.drawCard()

      expect(game.selectedCardValue).not.toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.THROW_OR_REPLACE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE,
      )
    })

    it("should draw card and reload the draw pile", async () => {
      await game.start()

      game["discardPile"] = [...game["drawPile"], ...game["discardPile"]]
      game["drawPile"] = []

      const nbCardsUsedByPlayers = game.players.length * CARDS_PER_PLAYER

      expect(game.selectedCardValue).toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
      expect(game["drawPile"]).toHaveLength(0)
      expect(game["discardPile"]).toHaveLength(
        TOTAL_CARDS - nbCardsUsedByPlayers,
      )

      game.drawCard()

      expect(game.selectedCardValue).not.toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.THROW_OR_REPLACE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE,
      )
      // 150(total cards) - 2(nb player) * 12(cards per player) - 1(draw pile) - 1(discard pile)
      expect(game["drawPile"]).toHaveLength(
        TOTAL_CARDS - nbCardsUsedByPlayers - 1 - 1,
      )
      expect(game["discardPile"]).toHaveLength(1)
    })
  })

  describe("pickFromDiscard", () => {
    it("should not pick from discard if there is no card in the discard pile", async () => {
      await game.start()

      game["discardPile"] = []

      game.pickFromDiscard()

      expect(game.selectedCardValue).toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
    })

    it("should pick from discard", async () => {
      await game.start()

      game["discardPile"].push(game["drawPile"].splice(0, 1)[0])

      game.pickFromDiscard()

      expect(game.selectedCardValue).toBeDefined()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.REPLACE_A_CARD,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.PICK_FROM_DISCARD_PILE,
      )
    })
  })

  describe("discardCard", () => {
    it("should discard card", () => {
      game.discardCard(10)

      expect(game.selectedCardValue).toBeNull()
      expect(game["discardPile"]).toHaveLength(1)
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.TURN_A_CARD,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.THROW,
      )
    })
  })

  describe("replaceCard", () => {
    it("should replace a card", async () => {
      await game.start()

      const oldCardValue = player.cards[0][0].value
      game.turn = 0
      game.selectedCardValue = 10

      game.replaceCard({
        column: 0,
        row: 0,
      })

      expect(player.cards[0][0].isVisible).toBeTruthy()
      expect(player.cards[0][0].value).toBe(10)
      expect(game["discardPile"]).include(oldCardValue)
      expect(game.selectedCardValue).toBeNull()
      expect(player.cards[0][0].isVisible).toBeTruthy()
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.REPLACE,
      )
    })
  })

  describe("turnCard", () => {
    it("should turn card", async () => {
      await game.start()
      const card = player.cards[0][0]
      expect(card.isVisible).toBeFalsy()

      game.turnCard({
        player,
        column: 0,
        row: 0,
      })

      expect(card.isVisible).toBeTruthy()
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.TURN,
      )
    })
  })

  describe("finishTurn", async () => {
    it("should finish turn without afk", async () => {
      game.settings.initialTurnedCount = 0
      await game.start()
      game.turn = 0
      // act like a replace
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.lastTurnStatus = Constants.LAST_TURN_STATUS.REPLACE
      game.selectedCardValue = null

      await game.finishTurn({ wasAfk: false })

      // Start the game with initialTurnedCount at 0 will trigger finishTurn. That's why cancelPlayerAfkTimer is called 2 times
      expect(operationManager.cancelPlayerAfkTimer).toHaveBeenCalledTimes(2)
      expect(operationManager.updateGame).toHaveBeenCalledTimes(0)
      expect(player.consecutiveAfkCount).toBe(0)
      expect(game.turn).toBe(1)
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.REPLACE,
      )
      // 2 times because the first time is when the game starts and the second time is when the player finishes the turn
      expect(operationManager.startPlayerAfkTimer).toHaveBeenCalledTimes(2)
    })

    it("should finish turn with afk", async () => {
      game.settings.initialTurnedCount = 0
      await game.start()
      game.turn = 0
      // act like a replace does by afk function
      player.consecutiveAfkCount = 1
      player.afkCount = 1
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.lastTurnStatus = Constants.LAST_TURN_STATUS.REPLACE
      game.selectedCardValue = null

      await game.finishTurn({ wasAfk: true })

      // Start the game with initialTurnedCount at 0 will trigger finishTurn. That's why cancelPlayerAfkTimer is called 2 times
      expect(operationManager.cancelPlayerAfkTimer).toHaveBeenCalledTimes(2)
      expect(operationManager.updateGame).toHaveBeenCalledTimes(0)
      expect(player.consecutiveAfkCount).toBe(1)
      expect(game.turn).toBe(1)
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.REPLACE,
      )
      // 2 times because the first time is when the game starts and the second time is when the player finishes the turn
      expect(operationManager.startPlayerAfkTimer).toHaveBeenCalledTimes(2)
    })

    it("should finish turn in last lap phase and end round when all players have played", async () => {
      game.settings.initialTurnedCount = 0
      await game.start()
      game.turn = 0

      // Set up last lap scenario
      game.roundPhase = Constants.ROUND_PHASE.LAST_LAP
      player.hasPlayedLastTurn = false
      opponent.hasPlayedLastTurn = true

      // Mock shouldEndRound to return true after player's turn is marked
      const shouldEndRoundSpy = vi
        .spyOn(game as any, "shouldEndRound")
        .mockImplementation(() => {
          // This will be true after player.hasPlayedLastTurn is set to true
          return player.hasPlayedLastTurn && opponent.hasPlayedLastTurn
        })

      const endRoundSpy = vi
        .spyOn(game as any, "endRound")
        .mockImplementation(() => {})

      await game.finishTurn({ wasAfk: false })

      // Verify player's turn is marked as played
      expect(player.hasPlayedLastTurn).toBe(true)

      // Verify all cards are turned
      expect(player.cards.flat().every((card) => card.isVisible)).toBe(true)

      // Verify shouldEndRound was called
      expect(shouldEndRoundSpy).toHaveBeenCalled()

      // Verify endRound was called
      expect(endRoundSpy).toHaveBeenCalled()

      // Verify turn is passed to next player
      expect(game.turn).toBe(1)
    })

    it("should finish turn in last lap phase but not end round when not all players have played", async () => {
      game.settings.initialTurnedCount = 0
      await game.start()
      game.turn = 0

      // Set up last lap scenario
      game.roundPhase = Constants.ROUND_PHASE.LAST_LAP
      player.hasPlayedLastTurn = false
      opponent.hasPlayedLastTurn = false

      // Mock shouldEndRound to return false
      const shouldEndRoundSpy = vi
        .spyOn(game as any, "shouldEndRound")
        .mockReturnValue(false)

      const endRoundSpy = vi
        .spyOn(game as any, "endRound")
        .mockImplementation(() => {})

      await game.finishTurn({ wasAfk: false })

      // Verify player's turn is marked as played
      expect(player.hasPlayedLastTurn).toBe(true)

      // Verify all cards are turned
      expect(player.cards.flat().every((card) => card.isVisible)).toBe(true)

      // Verify shouldEndRound was called
      expect(shouldEndRoundSpy).toHaveBeenCalled()

      // Verify endRound was not called
      expect(endRoundSpy).not.toHaveBeenCalled()

      // Verify turn is passed to next player
      expect(game.turn).toBe(1)
    })

    it("should finish turn in last lap, show all player cards and discard matching cards", async () => {
      game.settings.initialTurnedCount = 0
      game.settings.removeIdenticalColumn = true
      await game.start()
      game.turn = 0
      game.roundPhase = Constants.ROUND_PHASE.LAST_LAP
      player.hasPlayedLastTurn = false
      opponent.hasPlayedLastTurn = true

      player.cards = [
        [new Card(5, false), new Card(3, true), new Card(1, true)], // Column 0: hidden 5, visible 3, visible 1
        [new Card(5, false), new Card(4, true), new Card(2, true)], // Column 1: hidden 5, visible 4, visible 2
        [new Card(5, false), new Card(6, true), new Card(7, true)], // Column 2: hidden 5, visible 6, visible 7
        [new Card(8, false), new Card(9, true), new Card(10, true)], // Column 3: hidden 8, visible 9, visible 10
      ]

      const operationOrder: string[] = []
      let checkCardsToDiscardCallCount = 0

      const turnAllCardsSpy = vi
        .spyOn(player, "turnAllCards")
        .mockImplementation(() => {
          operationOrder.push("turnAllCards")

          for (const card of player.cards.flat()) {
            card.turnVisible()
          }
        })

      // Helper function to handle column 0 card discarding
      const handleColumn0Discard = (playerParam: Player) => {
        if (playerParam === player) {
          const column0Cards = [
            player.cards[0][0],
            player.cards[1][0],
            player.cards[2][0],
          ]
          if (
            column0Cards.every((card) => card.value === 5 && card.isVisible)
          ) {
            for (const card of column0Cards) {
              game.discardCard(card.value)
            }
          }
        }
      }

      // Mock implementation for checkCardsToDiscard
      const checkCardsToDiscardMock = (playerParam: Player) => {
        checkCardsToDiscardCallCount++
        operationOrder.push(
          `checkCardsToDiscard-${checkCardsToDiscardCallCount}`,
        )

        const allCardsVisible = playerParam.cards
          .flat()
          .every((card) => card.isVisible)

        if (checkCardsToDiscardCallCount === 1) {
          expect(allCardsVisible).toBe(false)
        } else if (checkCardsToDiscardCallCount === 2) {
          expect(allCardsVisible).toBe(true)
          handleColumn0Discard(playerParam)
        }
      }

      const checkCardsToDiscardSpy = vi
        .spyOn(game as any, "checkCardsToDiscard")
        // @ts-ignore - test code
        .mockImplementation(checkCardsToDiscardMock)

      const shouldEndRoundSpy = vi
        .spyOn(game as any, "shouldEndRound")
        .mockReturnValue(true)
      const endRoundSpy = vi
        .spyOn(game as any, "endRound")
        .mockImplementation(() => {})

      await game.finishTurn({ wasAfk: false })

      expect(operationOrder).toEqual([
        "checkCardsToDiscard-1",
        "turnAllCards",
        "checkCardsToDiscard-2",
      ])

      expect(turnAllCardsSpy).toHaveBeenCalled()
      expect(checkCardsToDiscardSpy).toHaveBeenCalledTimes(2)

      expect(endRoundSpy).toHaveBeenCalled()

      turnAllCardsSpy.mockRestore()
      checkCardsToDiscardSpy.mockRestore()
      shouldEndRoundSpy.mockRestore()
      endRoundSpy.mockRestore()
    })
  })

  describe("togglePlayerReplay", () => {
    it("should toggle player replay", async () => {
      player.wantsReplay = true
      await game.togglePlayerReplay(player.id)
      expect(player.wantsReplay).toBeFalsy()

      await game.togglePlayerReplay(player.id)
      expect(player.wantsReplay).toBeTruthy()
    })
  })

  describe("setPlayerToLeave", () => {
    it("should trigger replay when last non-voting player leaves finished game", async () => {
      // Setup: Create a finished game with 3 players
      const player3 = new Player(
        { name: "player3", avatar: Constants.AVATARS.DOG },
        "socket3",
      )
      game.addPlayer(opponent)
      game.addPlayer(player3)
      game.status = Constants.GAME_STATUS.FINISHED

      // Mock the startNewGame method to track if it's called
      const startNewGameSpy = vi
        .spyOn(game as any, "startNewGame")
        .mockImplementation(() => Promise.resolve())

      // Player 1 and 2 want to replay, player 3 doesn't
      player.wantsReplay = true
      opponent.wantsReplay = true
      player3.wantsReplay = false

      // When player 3 leaves, the game should start new game
      await game.setPlayerToLeave(player3)

      // Verify player 3 is marked as LEAVE (not DISCONNECTED since game is finished)
      expect(player3.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)

      // Verify startNewGame was called
      expect(startNewGameSpy).toHaveBeenCalled()

      // Restore the mock
      startNewGameSpy.mockRestore()
    })

    it("should not trigger replay when not enough remaining players want to replay", async () => {
      // Setup: Create a finished game with 3 players
      const player3 = new Player(
        { name: "player3", avatar: Constants.AVATARS.DOG },
        "socket3",
      )
      game.addPlayer(opponent)
      game.addPlayer(player3)
      game.status = Constants.GAME_STATUS.FINISHED

      // Mock the startNewGame method
      const startNewGameSpy = vi
        .spyOn(game as any, "startNewGame")
        .mockImplementation(() => Promise.resolve())

      // Only player 1 wants to replay, opponents don't
      player.wantsReplay = true
      opponent.wantsReplay = false
      player3.wantsReplay = false

      // When player 3 leaves, the game should NOT start new game
      // because not all remaining players want to replay (opponent doesn't want to)
      await game.setPlayerToLeave(player3)

      // Verify player 3 is marked as LEAVE
      expect(player3.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)

      // Verify startNewGame was NOT called
      expect(startNewGameSpy).not.toHaveBeenCalled()

      // Restore the mock
      startNewGameSpy.mockRestore()
    })

    it("should mark player as LEAVE when game is playing", async () => {
      // Setup: Game is playing
      game.addPlayer(opponent)
      game.status = Constants.GAME_STATUS.PLAYING

      // When player leaves during game
      await game.setPlayerToLeave(opponent)

      // Verify player is marked as LEAVE (not DISCONNECTED)
      expect(opponent.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)
    })

    it("should disconnect player when game is in lobby", async () => {
      // Setup: Game is in lobby
      game.addPlayer(opponent)
      game.status = Constants.GAME_STATUS.LOBBY

      // Mock disconnectPlayer
      const disconnectSpy = vi
        .spyOn(game, "disconnectPlayer")
        .mockImplementation(() => Promise.resolve())

      // When player leaves from lobby
      await game.setPlayerToLeave(opponent)

      // Verify disconnectPlayer was called
      expect(disconnectSpy).toHaveBeenCalledWith(opponent)

      // Restore the mock
      disconnectSpy.mockRestore()
    })

    it("should transfer host when host leaves finished game during replay flow", async () => {
      // Setup: Game is finished, player B is host
      game.addPlayer(opponent)
      game.status = Constants.GAME_STATUS.FINISHED
      game.hostId = opponent.id // opponent (player B) is the host

      // Verify initial state
      expect(game.hostId).toBe(opponent.id)
      expect(game.isHost(opponent.id)).toBe(true)
      expect(game.isHost(player.id)).toBe(false)

      // When host (opponent/player B) leaves the finished game
      await game.setPlayerToLeave(opponent)

      // Verify host was transferred to remaining player
      expect(game.hostId).toBe(player.id)
      expect(game.isHost(player.id)).toBe(true)
      expect(game.isHost(opponent.id)).toBe(false)

      // Verify opponent's status is set to LEAVE (not disconnected since game is finished)
      expect(opponent.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)
    })

    it("should handle the original bug scenario: host leaves after other player replays", async () => {
      // Scenario: End of game with Player B as host
      game.addPlayer(opponent)
      game.status = Constants.GAME_STATUS.FINISHED
      game.hostId = opponent.id // Player B (opponent) is host

      // Ensure both players are connected initially
      player.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED
      opponent.connectionStatus = Constants.CONNECTION_STATUS.CONNECTED

      // Step 1: Player A (player) wants to replay
      await game.togglePlayerReplay(player.id)
      expect(player.wantsReplay).toBe(true)
      expect(opponent.wantsReplay).toBe(false) // Player B hasn't chosen yet

      // Verify game is still finished (not started because not all players want replay)
      expect(game.status).toBe(Constants.GAME_STATUS.FINISHED)
      expect(game.hostId).toBe(opponent.id) // Player B still host

      // Step 2: Player B (host) leaves
      await game.setPlayerToLeave(opponent)

      // Verify the fix: When host leaves after a player wants replay,
      // the new game should start automatically and Player A should be the host
      expect(game.status).toBe(Constants.GAME_STATUS.LOBBY) // New game started automatically
      expect(game.hostId).toBe(player.id) // Player A is now host
      expect(game.isHost(player.id)).toBe(true)
      expect(game.isHost(opponent.id)).toBe(false)

      // Verify Player B's status is LEAVE
      expect(opponent.connectionStatus).toBe(Constants.CONNECTION_STATUS.LEAVE)
      // Verify Player A is still connected
      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.CONNECTED,
      )

      // Verify Player A can control the new game as host
      // (this was the original bug - Player A would not be host)
    })
  })

  describe("resetGame", () => {
    it("should reset the round of the game", () => {
      game.roundNumber = 10
      for (const player of game.players) {
        player.scores = [10, 20]
        player.score = 30
        player.wantsReplay = true
      }

      game["resetGame"]()

      expect(game.roundNumber).toBe(1)
      for (const player of game.players) {
        expect(player.scores).toStrictEqual([])
        expect(player.score).toBe(0)
        expect(player.wantsReplay).toBeFalsy()
      }
    })
  })

  describe("toJson", () => {
    it("should return json", () => {
      const gameToJson = game.toJson()

      expect(gameToJson).toStrictEqual({
        code: game.code,
        status: Constants.GAME_STATUS.LOBBY,
        roundPhase: Constants.ROUND_PHASE.REVEAL_CARDS,
        hostId: player.id,
        players: game.players.map((player) => player.toJson()),
        selectedCardValue: null,
        lastDiscardCardValue: game["discardPile"][["_discardPile"].length - 1],
        lastTurnStatus: Constants.LAST_TURN_STATUS.TURN,
        turn: 0,
        turnStatus: Constants.TURN_STATUS.CHOOSE_A_PILE,
        settings: game.settings.toJson(),
        stateVersion: game.stateVersion,
        updatedAt: game.updatedAt,
      })
    })
  })

  describe("serializeGame", () => {
    it("should serialize game", async () => {
      await game.start()

      const gameSerialized = game.serialize()
      expect(gameSerialized).toStrictEqual({
        id: game.id,
        hostId: player.id,
        code: game.code,
        status: game.status,
        isFull: game.isFull(),
        drawPile: game["drawPile"],
        discardPile: game["discardPile"],
        firstToFinishPlayerId: game.firstToFinishPlayerId,
        selectedCardValue: game.selectedCardValue,
        roundNumber: game.roundNumber,
        roundPhase: game.roundPhase,
        turn: game.turn,
        turnStatus: Constants.TURN_STATUS.CHOOSE_A_PILE,
        lastTurnStatus: Constants.LAST_TURN_STATUS.TURN,
        bannedUserIds: game.bannedUserIds,
        bannedGuestIds: game.bannedGuestIds,
        players: [
          {
            id: player.id,
            name: player.name,
            avatar: Constants.AVATARS.BEE,
            userId: player.userId ?? null,
            username: player.username ?? null,
            guestId: player.guestId ?? null,
            cards: player.cards.map((column) =>
              column.map((card) => ({
                id: card.id,
                value: card.value,
                isVisible: card.isVisible,
              })),
            ),
            connectionStatus: player.connectionStatus,
            afkCount: player.afkCount,
            consecutiveAfkCount: player.consecutiveAfkCount,
            turnStartTime: player.turnStartTime,
            hasPlayedLastTurn: player.hasPlayedLastTurn,
            score: player.score,
            scores: player.scores,
            socketId: player.socketId,
            wantsReplay: player.wantsReplay,
            sessionId: player.getSessionId(),
            forfeited: player.forfeited,
            forfeitedAt: player.forfeitedAt,
            hasRevealedCardCount: player.hasRevealedCardCount,
            disconnectedAfkCount: player.disconnectedAfkCount,
            timeout: player.timeout,
          },
          {
            id: opponent.id,
            name: opponent.name,
            avatar: Constants.AVATARS.ELEPHANT,
            userId: opponent.userId ?? null,
            username: opponent.username ?? null,
            guestId: opponent.guestId ?? null,
            cards: opponent.cards.map((column) =>
              column.map((card) => ({
                id: card.id,
                value: card.value,
                isVisible: card.isVisible,
              })),
            ),
            connectionStatus: opponent.connectionStatus,
            afkCount: opponent.afkCount,
            consecutiveAfkCount: opponent.consecutiveAfkCount,
            turnStartTime: opponent.turnStartTime,
            hasPlayedLastTurn: opponent.hasPlayedLastTurn,
            score: opponent.score,
            scores: opponent.scores,
            socketId: opponent.socketId,
            wantsReplay: opponent.wantsReplay,
            sessionId: opponent.getSessionId(),
            forfeited: opponent.forfeited,
            forfeitedAt: opponent.forfeitedAt,
            hasRevealedCardCount: opponent.hasRevealedCardCount,
            disconnectedAfkCount: opponent.disconnectedAfkCount,
            timeout: opponent.timeout,
          },
        ],
        settings: {
          isConfirmed: false,
          removeIdenticalColumn: true,
          removeIdenticalRow: false,
          cardPerColumn: 4,
          cardPerRow: 3,
          initialTurnedCount: 2,
          maxPlayers: 8,
          private: false,
          scoreToEndGame: 100,
          firstPlayerMultiplierPenalty: 2,
          firstPlayerPenaltyType:
            Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
          firstPlayerFlatPenalty: 0,
          showCurrentScore: false,
          playerRearrangement: Constants.PLAYER_REARRANGEMENT.NEVER,
        },
        stateVersion: game.stateVersion,
        processingAfk: game.processingAfk,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      } satisfies GameRedisDb)
    })
  })

  describe("multiplierPenalty", () => {
    it("should multiply positive score by penalty multiplier", () => {
      const score = 10
      game.settings.firstPlayerMultiplierPenalty = 2

      const result = game["multiplierPenalty"](score)

      expect(result).toBe(20)
    })

    it("should not change negative score", () => {
      const score = -5
      game.settings.firstPlayerMultiplierPenalty = 2

      const result = game["multiplierPenalty"](score)

      expect(result).toBe(-5)
    })
  })

  describe("flatPenalty", () => {
    it("should add flat penalty to score", () => {
      const score = 10
      game.settings.firstPlayerFlatPenalty = 5

      const result = game["flatPenalty"](score)

      expect(result).toBe(15)
    })
  })

  describe("shouldEndGame", () => {
    it("should return true when a player's score exceeds the score to end game", () => {
      game.settings.scoreToEndGame = 100
      player.score = 110

      const result = game["shouldEndGame"]()

      expect(result).toBe(true)
    })

    it("should return false when no player's score exceeds the score to end game", () => {
      game.settings.scoreToEndGame = 100
      player.score = 90
      opponent.score = 95

      const result = game["shouldEndGame"]()

      expect(result).toBe(false)
    })
  })

  describe("endGame", () => {
    it("should set the game status to finished and round phase to over", () => {
      game["endGame"]()

      expect(game.status).toBe(Constants.GAME_STATUS.FINISHED)
      expect(game.roundPhase).toBe(Constants.ROUND_PHASE.OVER)
    })
  })

  describe("shouldEndRound", () => {
    it("should return true when all connected players have played their last turn", () => {
      player.hasPlayedLastTurn = true
      opponent.hasPlayedLastTurn = true

      const result = game["shouldEndRound"]()

      expect(result).toBe(true)
    })

    it("should return false when not all connected players have played their last turn", () => {
      player.hasPlayedLastTurn = true
      opponent.hasPlayedLastTurn = false

      const result = game["shouldEndRound"]()

      expect(result).toBe(false)
    })
  })

  describe("endRound", () => {
    it("should turn all cards, check cards to discard, calculate final scores, and set round phase to over", () => {
      // Spy on methods
      const turnAllCardsSpy = vi.spyOn(player, "turnAllCards")
      const checkCardsToDiscardSpy = vi.spyOn(
        game as any,
        "checkCardsToDiscard",
      )
      const finalRoundScoreSpy = vi.spyOn(player, "finalRoundScore")
      const checkFirstPlayerPenaltySpy = vi.spyOn(
        game as any,
        "checkFirstPlayerPenalty",
      )

      game["endRound"]()

      expect(turnAllCardsSpy).toHaveBeenCalled()
      expect(checkCardsToDiscardSpy).toHaveBeenCalled()
      expect(finalRoundScoreSpy).toHaveBeenCalled()
      expect(checkFirstPlayerPenaltySpy).toHaveBeenCalled()
      expect(game.roundPhase).toBe(Constants.ROUND_PHASE.OVER)
    })

    it("should end the game if shouldEndGame returns true", () => {
      vi.spyOn(game as any, "shouldEndGame").mockReturnValue(true)
      const endGameSpy = vi.spyOn(game as any, "endGame")

      game["endRound"]()

      expect(endGameSpy).toHaveBeenCalled()
    })
  })

  describe("checkFirstPlayerPenalty", () => {
    beforeEach(() => {
      game.roundNumber = 1
      player.scores = [10]
      opponent.scores = [5]
      game.firstToFinishPlayerId = player.id
    })

    it("should not apply penalty if firstToFinishPlayerId is not set", () => {
      game.firstToFinishPlayerId = null
      const recalculateScoreSpy = vi.spyOn(player, "recalculateScore")

      game["checkFirstPlayerPenalty"]()

      expect(recalculateScoreSpy).not.toHaveBeenCalled()
      expect(player.scores[0]).toBe(10)
    })

    it("should not apply penalty if firstToFinishPlayer has a string score", () => {
      player.scores = ["-"]
      const recalculateScoreSpy = vi.spyOn(player, "recalculateScore")

      game["checkFirstPlayerPenalty"]()

      expect(recalculateScoreSpy).not.toHaveBeenCalled()
      expect(player.scores[0]).toBe("-")
    })

    it("should not apply penalty if no other player has a lower score", () => {
      opponent.scores = [15]
      const recalculateScoreSpy = vi.spyOn(player, "recalculateScore")

      game["checkFirstPlayerPenalty"]()

      expect(recalculateScoreSpy).not.toHaveBeenCalled()
      expect(player.scores[0]).toBe(10)
    })

    it("should apply multiplier penalty when penalty type is MULTIPLIER_ONLY", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toMatchObject({
        score: 20,
        penalty: 10,
        originalScore: 10,
      })
    })

    it("should apply flat penalty when penalty type is FLAT_ONLY", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_ONLY
      game.settings.firstPlayerFlatPenalty = 5

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toMatchObject({
        score: 15,
        penalty: 5,
        originalScore: 10,
      })
    })

    it("should apply flat then multiplier penalty when penalty type is FLAT_THEN_MULTIPLIER", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_THEN_MULTIPLIER
      game.settings.firstPlayerFlatPenalty = 5
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toMatchObject({
        score: 30,
        penalty: 20, // 5 flat and then 2 multiplier
        originalScore: 10,
      })
    })

    it("should apply multiplier then flat penalty when penalty type is MULTIPLIER_THEN_FLAT", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_THEN_FLAT
      game.settings.firstPlayerFlatPenalty = 5
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toMatchObject({
        score: 25,
        penalty: 15, // 2 multiplier and then 5 flat
        originalScore: 10,
      })
    })

    it("should handle when first player already has object score", () => {
      // Setup: first player already has a penalty score object
      player.scores = [{ score: 10, penalty: 0, originalScore: 10 }]
      opponent.scores = [5]
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toMatchObject({
        score: 20,
        penalty: 10,
        originalScore: 10,
      })
    })

    it("should handle when other player has object score", () => {
      // Setup: opponent has a penalty score object
      player.scores = [10]
      opponent.scores = [{ score: 5, penalty: 2, originalScore: 3 }]
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      // Should apply penalty because opponent's score (5) is still lower than player's (10)
      expect(player.scores[0]).toMatchObject({
        score: 20,
        penalty: 10,
        originalScore: 10,
      })
    })
  })

  describe("hasPlayerFinished", () => {
    it("should return true when all player cards are visible", () => {
      player.cards = [
        [new Card(1, true), new Card(2, true)],
        [new Card(3, true), new Card(4, true)],
      ]

      const result = game["hasPlayerFinished"](player)

      expect(result).toBe(true)
    })

    it("should return false when not all player cards are visible", () => {
      player.cards = [
        [new Card(1, true), new Card(2, false)],
        [new Card(3, true), new Card(4, true)],
      ]

      const result = game["hasPlayerFinished"](player)

      expect(result).toBe(false)
    })
  })

  describe("shouldSetFirstPlayerToFinish", () => {
    it("should return true when player has finished and firstToFinishPlayerId is not set", () => {
      game.firstToFinishPlayerId = null
      vi.spyOn(game as any, "hasPlayerFinished").mockReturnValue(true)

      const result = game["shouldSetFirstPlayerToFinish"](player)

      expect(result).toBe(true)
    })

    it("should return false when player has not finished", () => {
      game.firstToFinishPlayerId = null
      vi.spyOn(game as any, "hasPlayerFinished").mockReturnValue(false)

      const result = game["shouldSetFirstPlayerToFinish"](player)

      expect(result).toBe(false)
    })

    it("should return false when firstToFinishPlayerId is already set", () => {
      game.firstToFinishPlayerId = "somePlayerId"
      vi.spyOn(game as any, "hasPlayerFinished").mockReturnValue(true)

      const result = game["shouldSetFirstPlayerToFinish"](player)

      expect(result).toBe(false)
    })
  })

  describe("setFirstPlayerToFinish", () => {
    it("should set firstToFinishPlayerId and change round phase to LAST_LAP", () => {
      game.firstToFinishPlayerId = null
      game.roundPhase = Constants.ROUND_PHASE.MAIN

      game["setFirstPlayerToFinish"](player)

      expect(game.firstToFinishPlayerId).toBe(player.id)
      expect(game.roundPhase).toBe(Constants.ROUND_PHASE.LAST_LAP)
    })
  })

  describe("getNextTurn", () => {
    it("should return the next turn index", () => {
      game.turn = 0

      const result = game["getNextTurn"]()

      expect(result).toBe(1)
    })

    it("should skip disconnected players", () => {
      game.turn = 0
      opponent.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
      const thirdPlayer = new Player(
        { name: "player3", avatar: Constants.AVATARS.TURTLE },
        "socketId789",
      )
      game.addPlayer(thirdPlayer)

      const result = game["getNextTurn"]()

      expect(result).toBe(2)
    })

    it("should wrap around to the beginning of the player list", () => {
      game.turn = 1

      const result = game["getNextTurn"]()

      expect(result).toBe(0)
    })
  })

  describe("removeDisconnectedPlayers", () => {
    it("should remove disconnected players", () => {
      opponent.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

      game["removeDisconnectedPlayers"]()

      expect(game.players).toHaveLength(1)
      expect(game.players[0]).toBe(player)
    })

    it("should not remove connected players", () => {
      game["removeDisconnectedPlayers"]()

      expect(game.players).toHaveLength(2)
    })
  })

  describe("checkCardsToDiscard", () => {
    it("should discard cards when removeIdenticalColumn is true and there are columns to discard", () => {
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = false

      const columnsToDiscard = [new Card(5), new Card(5), new Card(5)]

      // Mock the player's checkColumnsAndDiscard to return cards first time, then empty array
      const checkColumnsSpy = vi
        .spyOn(player, "checkColumnsAndDiscard")
        .mockReturnValueOnce(columnsToDiscard)
        .mockReturnValue([])

      vi.spyOn(player, "checkRowsAndDiscard").mockReturnValue([])

      // Mock the discardCard method
      const discardCardSpy = vi
        .spyOn(game, "discardSelectedCard")
        .mockImplementation(() => {})

      // Don't mock the checkCardsToDiscard method itself
      game["checkCardsToDiscard"](player)

      expect(checkColumnsSpy).toHaveBeenCalledTimes(2)
      expect(discardCardSpy).toHaveBeenCalledTimes(3)
      expect(discardCardSpy).toHaveBeenCalledWith(5)
    })

    it("should discard cards when removeIdenticalRow is true and there are rows to discard", () => {
      game.settings.removeIdenticalColumn = false
      game.settings.removeIdenticalRow = true

      const rowsToDiscard = [new Card(7), new Card(7), new Card(7)]

      vi.spyOn(player, "checkColumnsAndDiscard").mockReturnValue([])

      // Mock the player's checkRowsAndDiscard to return cards first time, then empty array
      const checkRowsSpy = vi
        .spyOn(player, "checkRowsAndDiscard")
        .mockReturnValueOnce(rowsToDiscard)
        .mockReturnValue([])

      // Mock the discardCard method
      const discardCardSpy = vi
        .spyOn(game, "discardSelectedCard")
        .mockImplementation(() => {})

      // Don't mock the checkCardsToDiscard method itself
      game["checkCardsToDiscard"](player)

      expect(checkRowsSpy).toHaveBeenCalledTimes(2)
      expect(discardCardSpy).toHaveBeenCalledTimes(3)
      expect(discardCardSpy).toHaveBeenCalledWith(7)
    })

    it("should discard cards from both columns and rows when both settings are true", () => {
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = true

      const columnsToDiscard = [new Card(5), new Card(5)]
      const rowsToDiscard = [new Card(7), new Card(7)]

      // First call returns cards, second call returns empty array
      vi.spyOn(player, "checkColumnsAndDiscard")
        .mockReturnValueOnce(columnsToDiscard)
        .mockReturnValue([])

      vi.spyOn(player, "checkRowsAndDiscard")
        .mockReturnValueOnce(rowsToDiscard)
        .mockReturnValue([])

      // Mock the discardCard method
      const discardCardSpy = vi
        .spyOn(game, "discardSelectedCard")
        .mockImplementation(() => {})

      // Don't mock the checkCardsToDiscard method itself
      game["checkCardsToDiscard"](player)

      expect(discardCardSpy).toHaveBeenCalledTimes(4)
      expect(discardCardSpy).toHaveBeenCalledWith(5)
      expect(discardCardSpy).toHaveBeenCalledWith(7)
    })

    it("should not discard any cards when no cards to discard", () => {
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = true

      vi.spyOn(player, "checkColumnsAndDiscard").mockReturnValue([])
      vi.spyOn(player, "checkRowsAndDiscard").mockReturnValue([])

      const discardCardSpy = vi.spyOn(game, "discardSelectedCard")

      game["checkCardsToDiscard"](player)

      expect(discardCardSpy).not.toHaveBeenCalled()
    })

    it("should recursively check for more cards to discard", () => {
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = false

      // First call returns cards, second call returns empty array
      const firstCallCards = [new Card(5), new Card(5)]
      const checkColumnsSpy = vi
        .spyOn(player, "checkColumnsAndDiscard")
        .mockReturnValueOnce(firstCallCards)
        .mockReturnValue([])

      // Mock the discardCard method
      vi.spyOn(game, "discardSelectedCard").mockImplementation(() => {})

      // Spy on the checkCardsToDiscard method to verify it's called recursively
      const checkCardsToDiscardSpy = vi.spyOn(
        game as any,
        "checkCardsToDiscard",
      )

      game["checkCardsToDiscard"](player)

      expect(checkColumnsSpy).toHaveBeenCalledTimes(2)
      expect(checkCardsToDiscardSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe("haveAllPlayersRevealedCards", () => {
    it("should return true when all players have revealed the required number of cards", () => {
      game.settings.initialTurnedCount = 2

      player.hasRevealedCardCount = true
      opponent.hasRevealedCardCount = true

      const result = game["haveAllPlayersRevealedCards"]()

      expect(result).toBe(true)
    })

    it("should return false when not all players have revealed the required number of cards", () => {
      game.settings.initialTurnedCount = 2

      player.cards = [
        [new Card(1, true), new Card(2, true), new Card(3, false)],
        [new Card(4, false), new Card(5, false), new Card(6, false)],
      ]

      opponent.cards = [
        [new Card(7, true), new Card(8, false), new Card(9, false)],
        [new Card(10, false), new Card(11, false), new Card(12, false)],
      ]

      const result = game["haveAllPlayersRevealedCards"]()

      expect(result).toBe(false)
    })
  })

  describe("startRoundAfterInitialReveal", () => {
    it("should set round phase to MAIN and set the first player to start", async () => {
      const setFirstPlayerToStartSpy = vi
        .spyOn(game as any, "setFirstPlayerToStart")
        .mockResolvedValue(undefined)

      await game["startRoundAfterInitialReveal"]()

      expect(game.roundPhase).toBe(Constants.ROUND_PHASE.MAIN)
      expect(setFirstPlayerToStartSpy).toHaveBeenCalled()
    })
  })

  describe("setFirstPlayerToStart", () => {
    beforeEach(() => {
      vi.spyOn(
        game["operationManager"],
        "startPlayerAfkTimer",
      ).mockResolvedValue()
    })

    it("should set the player with the highest score as the first player", async () => {
      // Setup players with different scores
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]

      // Mock currentScoreArray to return different scores
      vi.spyOn(player1, "currentScoreArray").mockReturnValue([1, 2, 3]) // Sum: 6
      vi.spyOn(player2, "currentScoreArray").mockReturnValue([3, 4, 5]) // Sum: 12

      await game["setFirstPlayerToStart"]()

      // Player2 has higher score, so should be first
      expect(game.turn).toBe(1)
    })

    it("should handle tie by choosing player with highest card", async () => {
      // Setup players with tied scores but different max values
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]

      // Mock currentScoreArray to return tied scores but different max values
      vi.spyOn(player1, "currentScoreArray").mockReturnValue([2, 3, 4]) // Sum: 9, Max: 4
      vi.spyOn(player2, "currentScoreArray").mockReturnValue([3, 3, 3]) // Sum: 9, Max: 3

      await game["setFirstPlayerToStart"]()

      // Player1 has higher max card, so should be first
      expect(game.turn).toBe(0)
    })

    it("should handle complete tie by randomizing", async () => {
      // Setup players with identical scores
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]

      // Mock currentScoreArray to return identical scores
      vi.spyOn(player1, "currentScoreArray").mockReturnValue([3, 3, 3]) // Sum: 9, Max: 3
      vi.spyOn(player2, "currentScoreArray").mockReturnValue([3, 3, 3]) // Sum: 9, Max: 3

      // Mock Math.random to return a predictable value
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.1) // Will select first player

      await game["setFirstPlayerToStart"]()

      // Should select player based on random value
      expect(game.turn).toBe(0)
      expect(randomSpy).toHaveBeenCalled()

      // Reset and test with different random value
      randomSpy.mockReset()
      randomSpy.mockReturnValue(0.6) // Will select second player

      await game["setFirstPlayerToStart"]()

      // Should select player based on random value
      expect(game.turn).toBe(1)
    })

    it("should skip disconnected players", async () => {
      // Setup players with one disconnected
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      player1.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

      game.players = [player1, player2]

      // Mock currentScoreArray for the connected player
      vi.spyOn(player2, "currentScoreArray").mockReturnValue([1, 2, 3])

      await game["setFirstPlayerToStart"]()

      // Should skip disconnected player and select player2
      expect(game.turn).toBe(1)
    })

    it("should handle case when no players have scores", async () => {
      // Setup players with no scores
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )

      game.players = [player1]

      // Mock currentScoreArray to return empty array
      vi.spyOn(player1, "currentScoreArray").mockReturnValue([])

      await game["setFirstPlayerToStart"]()

      // Should default to first player
      expect(game.turn).toBe(0)
    })
  })

  describe("disconnectPlayer", () => {
    it("should set player connection status to disconnected", async () => {
      const player = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      game.players = [player]

      await game.disconnectPlayer(player)

      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.DISCONNECTED,
      )
    })

    it("should change host if disconnected player is host", async () => {
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]
      game.hostId = player1.id

      const changeHostSpy = vi.spyOn(game, "changeHost")

      await game.disconnectPlayer(player1)

      expect(changeHostSpy).toHaveBeenCalled()

      changeHostSpy.mockClear()
    })

    it("should kick socket if it exists", async () => {
      const player = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      game.players = [player]

      const mockSocket = { id: "socket1" } as any
      vi.spyOn(game["operationManager"], "getSocket").mockReturnValue(
        mockSocket,
      )
      const kickSocketSpy = vi.spyOn(game["operationManager"], "kickSocket")

      await game.disconnectPlayer(player)

      expect(kickSocketSpy).toHaveBeenCalledWith(mockSocket)

      kickSocketSpy.mockClear()
    })

    it("should remove player if game is not playing", async () => {
      const player = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      game.players = [player]
      game.status = Constants.GAME_STATUS.LOBBY

      const disconnectPlayerSpy = vi.spyOn(game, "disconnectPlayer")

      await game.disconnectPlayer(player)

      expect(disconnectPlayerSpy).toHaveBeenCalledWith(player)

      disconnectPlayerSpy.mockClear()
    })

    it("should stop game if not enough connected players", async () => {
      game.status = Constants.GAME_STATUS.PLAYING

      await game.disconnectPlayer(player)

      expect(game.status).toBe(Constants.GAME_STATUS.STOPPED)
    })

    it("should remove game if no more players and game is not playing", async () => {
      game.players = [player]

      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await game.disconnectPlayer(player)

      expect(removeGameSpy).toHaveBeenCalled()

      removeGameSpy.mockClear()
    })

    it("should remove game if no more players and game is playing", async () => {
      game.players = [player]
      game.status = Constants.GAME_STATUS.PLAYING

      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await game.disconnectPlayer(player)

      expect(removeGameSpy).toHaveBeenCalled()

      removeGameSpy.mockClear()
    })

    it("should remove the game if no players are left", async () => {
      game.status = Constants.GAME_STATUS.LOBBY // Ensure we're not in playing mode

      const mockOperationManager = {
        getSocket: vi.fn().mockReturnValue(null),
        kickSocket: vi.fn(),
        removeGame: vi.fn(),
        // Add other methods if needed
        cancelPlayerAfkTimer: vi.fn(),
        cancelRevealCardsAfkTimer: vi.fn(),
        startRevealCardsAfkTimer: vi.fn(),
        updateGame: vi.fn(),
        startPlayerAfkTimer: vi.fn(),
        delayNewRound: vi.fn(),
      }

      // Make a new game with just one player
      const testGame = new Game({ hostId: player.id, settings: new Settings() })
      testGame.addPlayer(player)

      // Access the private operationManager through type assertion
      ;(testGame as any).operationManager = mockOperationManager

      // Disconnect the only player
      await testGame.disconnectPlayer(player)

      expect(mockOperationManager.removeGame).toHaveBeenCalled()
    })

    it("should set game status to STOPPED if minimum players are not connected while playing", async () => {
      game.status = Constants.GAME_STATUS.PLAYING

      // Mock the hasMinPlayersConnected method to return false
      const hasMinPlayersSpy = vi
        .spyOn(game, "hasMinPlayersConnected")
        .mockReturnValue(false)

      const mockOperationManager = {
        getSocket: vi.fn().mockReturnValue(null),
        kickSocket: vi.fn(),
        removeGame: vi.fn(),
        updateGame: vi.fn(),
        startRevealCardsAfkTimer: vi.fn(),
        cancelRevealCardsAfkTimer: vi.fn(),
        startPlayerAfkTimer: vi.fn(),
        cancelPlayerAfkTimer: vi.fn(),
        delayNewRound: vi.fn(),
        storeGameIfNeeded: vi.fn(),
      }

      // Access the private operationManager through type assertion
      ;(game as any).operationManager = mockOperationManager

      await game.disconnectPlayer(player)

      expect(game.status).toBe(Constants.GAME_STATUS.STOPPED)

      hasMinPlayersSpy.mockRestore()
    })

    it("should start round after initial reveal when all players have revealed cards", async () => {
      // Setup
      const player1 = new Player(
        { name: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new Player(
        { name: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )
      const player3 = new Player(
        { name: "Player3", avatar: Constants.AVATARS.BEE },
        "socket3",
      )

      game.players = [player1, player2, player3]
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS

      // Mark two players as having revealed cards
      player1.hasRevealedCardCount = true
      player2.hasRevealedCardCount = true
      player3.hasRevealedCardCount = false

      const startRoundSpy = vi.spyOn(
        game as any,
        "startRoundAfterInitialReveal",
      )

      // Execute - disconnect player3
      await game.disconnectPlayer(player3)

      // Verify - should call startRoundAfterInitialReveal since now all remaining connected players have revealed
      expect(startRoundSpy).toHaveBeenCalled()

      startRoundSpy.mockClear()
    })
  })

  // Add tests for ban feature
  describe("banPlayer", () => {
    it("should add userId to bannedUserIds if not already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        21312213132,
      )
      game.addPlayer(targetPlayer)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedUserIds).toContain(targetPlayer.userId)
      expect(game.bannedUserIds.length).toBe(1)
    })

    it("should not add userId to bannedUserIds if already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        21312213132,
      )
      game.addPlayer(targetPlayer)
      game.bannedUserIds.push(targetPlayer.userId!)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedUserIds).toContain(targetPlayer.userId!)
      expect(game.bannedUserIds.length).toBe(1)
    })

    it("should add guestId to bannedGuestIds if not already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        123,
        "guestId",
        "guestId",
      )
      game.addPlayer(targetPlayer)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedGuestIds).toContain(targetPlayer.guestId!)
      expect(game.bannedGuestIds.length).toBe(1)
    })

    it("should not add guestId to bannedGuestIds if already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        123,
        "guestId",
        "guestId",
      )
      game.addPlayer(targetPlayer)
      game.bannedGuestIds.push(targetPlayer.guestId!)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedGuestIds).toContain(targetPlayer.guestId!)
      expect(game.bannedGuestIds.length).toBe(1)
    })
  })

  describe("isPlayerBanned", () => {
    it("should return true if player id is in bannedPlayerIds", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        21312213132,
      )
      game.addPlayer(targetPlayer)
      game.bannedUserIds.push(targetPlayer.userId!)

      // Execute & Verify
      expect(game.isPlayerBanned(targetPlayer)).toBe(true)
    })

    it("should return true if player userId is in bannedUserIds", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        21312213132,
      )
      game.addPlayer(targetPlayer)
      game.bannedUserIds.push(targetPlayer.userId!)

      // Execute & Verify
      expect(game.isPlayerBanned(targetPlayer)).toBe(true)
    })

    it("should return true if player guestId is in bannedGuestIds", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
        undefined,
        undefined,
        "guest-123",
      )
      game.addPlayer(targetPlayer)
      game.bannedGuestIds.push(targetPlayer.guestId!)

      // Execute & Verify
      expect(game.isPlayerBanned(targetPlayer)).toBe(true)
    })

    it("should return false if player is not banned", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)

      // Execute & Verify
      expect(game.isPlayerBanned(targetPlayer)).toBe(false)
    })
  })

  describe("Private functions", () => {
    describe("shouldStartNewGame", () => {
      it("should return true when all connected players want to replay", () => {
        player.wantsReplay = true
        opponent.wantsReplay = true

        const result = game["shouldStartNewGame"]()

        expect(result).toBe(true)
      })

      it("should return false when not all connected players want to replay", () => {
        player.wantsReplay = true
        opponent.wantsReplay = false

        const result = game["shouldStartNewGame"]()

        expect(result).toBe(false)
      })
    })

    describe("startNewGame", () => {
      it("should reset game state and return to lobby and not allow host to change settings again if game is public", async () => {
        const mockOperationManager = {
          cancelPlayerAfkTimer: vi.fn(),
          cancelRevealCardsAfkTimer: vi.fn(),
          startRevealCardsAfkTimer: vi.fn(),
          removeGame: vi.fn(),
          updateGame: vi.fn(),
          startPlayerAfkTimer: vi.fn(),
          getSocket: vi.fn(),
          kickSocket: vi.fn(),
          delayNewRound: vi.fn(),
        }

        // Access the private operationManager through type assertion
        ;(game as any).operationManager = mockOperationManager

        // Mock the initializeRound method to avoid calling the full game initialization
        vi.spyOn(game as any, "initializeRound").mockImplementation(() =>
          Promise.resolve(),
        )

        game.status = Constants.GAME_STATUS.FINISHED
        game.stateVersion = 10
        game.turn = 1
        game.settings.isConfirmed = true

        await game["startNewGame"]()

        expect(mockOperationManager.cancelPlayerAfkTimer).toHaveBeenCalledTimes(
          2,
        )
        // cancelRevealCardsAfkTimer should be called for each player (2 times)
        expect(
          mockOperationManager.cancelRevealCardsAfkTimer,
        ).toHaveBeenCalledTimes(2)
        expect(game.status).toBe(Constants.GAME_STATUS.LOBBY)
        expect(game.stateVersion).toBe(0)
        expect(game.turn).toBe(0)
        expect(game.settings.isConfirmed).toBe(true)
      })

      it("should reset game state and return to lobby and allow host to change settings again if game is private", async () => {
        const mockOperationManager = {
          cancelPlayerAfkTimer: vi.fn(),
          cancelRevealCardsAfkTimer: vi.fn(),
          startRevealCardsAfkTimer: vi.fn(),
          removeGame: vi.fn(),
          updateGame: vi.fn(),
          startPlayerAfkTimer: vi.fn(),
          getSocket: vi.fn(),
          kickSocket: vi.fn(),
          delayNewRound: vi.fn(),
        }

        // Access the private operationManager through type assertion
        ;(game as any).operationManager = mockOperationManager

        // Mock the initializeRound method to avoid calling the full game initialization
        vi.spyOn(game as any, "initializeRound").mockImplementation(() =>
          Promise.resolve(),
        )

        game.status = Constants.GAME_STATUS.FINISHED
        game.stateVersion = 10
        game.turn = 1
        game.settings.isConfirmed = true
        game.settings.private = true

        await game["startNewGame"]()

        expect(mockOperationManager.cancelPlayerAfkTimer).toHaveBeenCalledTimes(
          2,
        )
        // cancelRevealCardsAfkTimer should be called for each player (2 times)
        expect(
          mockOperationManager.cancelRevealCardsAfkTimer,
        ).toHaveBeenCalledTimes(2)
        expect(game.status).toBe(Constants.GAME_STATUS.LOBBY)
        expect(game.stateVersion).toBe(0)
        expect(game.turn).toBe(0)
        expect(game.settings.isConfirmed).toBe(false)
      })
    })

    describe("startNewRound", () => {
      it("should increment roundNumber and initialize a new round", async () => {
        // Set initial round number
        game.roundNumber = 1

        // Mock the initializeRound method
        const initializeRoundSpy = vi
          .spyOn(game as any, "initializeRound")
          .mockImplementation(() => Promise.resolve())

        // Call the private method
        await game["startNewRound"]()

        // Check that round number was incremented
        expect(game.roundNumber).toBe(2)

        // Check that initializeRound was called
        expect(initializeRoundSpy).toHaveBeenCalled()

        // Restore the mock
        initializeRoundSpy.mockRestore()
      })
    })

    describe("player rearrangement", () => {
      describe("shufflePlayers", () => {
        it("should not shuffle when there is only 1 connected player", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          freshGame.addPlayer(player)

          const originalOrder = freshGame.players.map((p) => p.id)
          freshGame["shufflePlayers"]()
          const newOrder = freshGame.players.map((p) => p.id)

          expect(newOrder).toEqual(originalOrder)
        })

        it("should not shuffle when there are only 2 connected players", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          const player2 = new Player(
            { name: "player2", avatar: Constants.AVATARS.CAT },
            "socket2",
            2,
            "username2",
          )

          freshGame.addPlayer(player)
          freshGame.addPlayer(player2)

          const originalOrder = freshGame.players.map((p) => p.id)
          freshGame["shufflePlayers"]()
          const newOrder = freshGame.players.map((p) => p.id)

          expect(newOrder).toEqual(originalOrder)
        })

        it("should shuffle when there are 3+ connected players", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          const player2 = new Player(
            { name: "player2", avatar: Constants.AVATARS.CAT },
            "socket2",
            2,
            "username2",
          )
          const player3 = new Player(
            { name: "player3", avatar: Constants.AVATARS.DOG },
            "socket3",
            3,
            "username3",
          )

          freshGame.addPlayer(player)
          freshGame.addPlayer(player2)
          freshGame.addPlayer(player3)

          const originalOrder = freshGame.players.map((p) => p.id)
          const originalIds = new Set(originalOrder)

          freshGame["shufflePlayers"]()

          const newOrder = freshGame.players.map((p) => p.id)
          const newIds = new Set(newOrder)

          expect(newOrder).toHaveLength(originalOrder.length)
          expect(newIds).toEqual(originalIds)
        })

        it("should not shuffle disconnected players - keep them in place", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          const player2 = new Player(
            { name: "player2", avatar: Constants.AVATARS.CAT },
            "socket2",
            2,
            "username2",
          )
          const player3 = new Player(
            { name: "player3", avatar: Constants.AVATARS.DOG },
            "socket3",
            3,
            "username3",
          )
          const player4 = new Player(
            { name: "player4", avatar: Constants.AVATARS.ELEPHANT },
            "socket4",
            4,
            "username4",
          )

          // Set up: 2 connected players + 2 disconnected players
          player2.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
          player4.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

          freshGame.addPlayer(player) // connected - index 0
          freshGame.addPlayer(player2) // disconnected - index 1
          freshGame.addPlayer(player3) // connected - index 2
          freshGame.addPlayer(player4) // disconnected - index 3

          const originalOrder = freshGame.players.map((p) => p.id)

          // Should not shuffle because only 2 connected players
          freshGame["shufflePlayers"]()

          const newOrder = freshGame.players.map((p) => p.id)

          // All players should be in same positions (no shuffle with 2 connected)
          expect(newOrder).toEqual(originalOrder)

          // Disconnected players should definitely be in same positions
          expect(newOrder[1]).toBe(player2.id) // disconnected at index 1
          expect(newOrder[3]).toBe(player4.id) // disconnected at index 3
        })

        it("should shuffle only connected players with disconnected players mixed in", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          const player2 = new Player(
            { name: "player2", avatar: Constants.AVATARS.CAT },
            "socket2",
            2,
            "username2",
          )
          const player3 = new Player(
            { name: "player3", avatar: Constants.AVATARS.DOG },
            "socket3",
            3,
            "username3",
          )
          const player4 = new Player(
            { name: "player4", avatar: Constants.AVATARS.ELEPHANT },
            "socket4",
            4,
            "username4",
          )
          const player5 = new Player(
            { name: "player5", avatar: Constants.AVATARS.FOX },
            "socket5",
            5,
            "username5",
          )

          // Set up: 3 connected + 2 disconnected
          player2.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
          player4.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

          freshGame.addPlayer(player) // connected - index 0
          freshGame.addPlayer(player2) // disconnected - index 1
          freshGame.addPlayer(player3) // connected - index 2
          freshGame.addPlayer(player4) // disconnected - index 3
          freshGame.addPlayer(player5) // connected - index 4

          const originalOrder = freshGame.players.map((p) => p.id)

          freshGame["shufflePlayers"]()

          const newOrder = freshGame.players.map((p) => p.id)

          // Array length should be unchanged
          expect(newOrder).toHaveLength(originalOrder.length)

          // Disconnected players should be in exact same positions
          expect(newOrder[1]).toBe(player2.id)
          expect(newOrder[3]).toBe(player4.id)

          // Connected players should still be present but potentially shuffled
          const connectedPositions = [0, 2, 4]
          const connectedPlayersInNewOrder = connectedPositions.map(
            (i) => newOrder[i],
          )

          // All connected players should still be present
          expect(connectedPlayersInNewOrder).toContain(player.id)
          expect(connectedPlayersInNewOrder).toContain(player3.id)
          expect(connectedPlayersInNewOrder).toContain(player5.id)
        })

        it("should not shuffle if all players are disconnected", () => {
          // Create fresh game to avoid test contamination
          const freshGame = new Game({ hostId: player.id })
          freshGame.setOperationManager(operationManager)

          const player2 = new Player(
            { name: "player2", avatar: Constants.AVATARS.CAT },
            "socket2",
            2,
            "username2",
          )

          player.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
          player2.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED

          freshGame.addPlayer(player)
          freshGame.addPlayer(player2)

          const originalOrder = freshGame.players.map((p) => p.id)
          freshGame["shufflePlayers"]()
          const newOrder = freshGame.players.map((p) => p.id)

          expect(newOrder).toEqual(originalOrder)
        })
      })

      describe("resetGame with EVERY_GAME rearrangement", () => {
        it("should shuffle players when playerRearrangement is EVERY_GAME", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.EVERY_GAME

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["resetGame"]()

          expect(shufflePlayersSpy).toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })

        it("should not shuffle players when playerRearrangement is NEVER", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.NEVER

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["resetGame"]()

          expect(shufflePlayersSpy).not.toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })

        it("should not shuffle players when playerRearrangement is EVERY_ROUND", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.EVERY_ROUND

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["resetGame"]()

          expect(shufflePlayersSpy).not.toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })
      })

      describe("startNewRound with EVERY_ROUND rearrangement", () => {
        it("should shuffle players when playerRearrangement is EVERY_ROUND", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.EVERY_ROUND

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["startNewRound"]()

          expect(shufflePlayersSpy).toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })

        it("should not shuffle players when playerRearrangement is NEVER", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.NEVER

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["startNewRound"]()

          expect(shufflePlayersSpy).not.toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })

        it("should not shuffle players when playerRearrangement is EVERY_GAME", async () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.EVERY_GAME

          const shufflePlayersSpy = vi.spyOn(game as any, "shufflePlayers")
          const initializeRoundSpy = vi
            .spyOn(game as any, "initializeRound")
            .mockImplementation(() => Promise.resolve())

          await game["startNewRound"]()

          expect(shufflePlayersSpy).not.toHaveBeenCalled()
          expect(initializeRoundSpy).toHaveBeenCalled()

          shufflePlayersSpy.mockRestore()
          initializeRoundSpy.mockRestore()
        })
      })

      describe("serialize with playerRearrangement", () => {
        it("should include playerRearrangement in serialized settings", () => {
          game.settings.playerRearrangement =
            Constants.PLAYER_REARRANGEMENT.EVERY_ROUND

          const serialized = game.serialize()

          expect(serialized.settings.playerRearrangement).toBe(
            Constants.PLAYER_REARRANGEMENT.EVERY_ROUND,
          )
        })
      })
    })
  })
})
