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
        bannedPlayerIds: [],
        bannedNames: [],
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
        bannedPlayerIds: [],
        bannedNames: [],
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
    it("should set player connection status to leave", async () => {
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

  describe("resetRound", () => {
    it("should reset the round of the game", () => {
      game.roundNumber = 10
      game.players.forEach((player) => {
        player.scores = [10, 20]
        player.score = 30
        player.wantsReplay = true
      })

      game["resetRound"]()

      expect(game.roundNumber).toBe(1)
      game.players.forEach((player) => {
        expect(player.scores).toStrictEqual([])
        expect(player.score).toBe(0)
        expect(player.wantsReplay).toBeFalsy()
      })
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
        bannedPlayerIds: game.bannedPlayerIds,
        bannedNames: game.bannedNames,
        players: [
          {
            id: player.id,
            name: player.name,
            avatar: Constants.AVATARS.BEE,
            userId: player.userId ?? null,
            username: player.username ?? null,
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
          },
          {
            id: opponent.id,
            name: opponent.name,
            avatar: Constants.AVATARS.ELEPHANT,
            userId: opponent.userId ?? null,
            username: opponent.username ?? null,
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
        .spyOn(game, "discardCard")
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
        .spyOn(game, "discardCard")
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
        .spyOn(game, "discardCard")
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

      const discardCardSpy = vi.spyOn(game, "discardCard")

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
      vi.spyOn(game, "discardCard").mockImplementation(() => {})

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

      player.cards = [
        [new Card(1, true), new Card(2, true), new Card(3, false)],
        [new Card(4, false), new Card(5, false), new Card(6, false)],
      ]

      opponent.cards = [
        [new Card(7, true), new Card(8, true), new Card(9, false)],
        [new Card(10, false), new Card(11, false), new Card(12, false)],
      ]

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

    it("should not remove game if no more players and game is not playing (disabled for mobile stability)", async () => {
      game.players = [player]

      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await game.disconnectPlayer(player)

      expect(removeGameSpy).not.toHaveBeenCalled()

      removeGameSpy.mockClear()
    })

    it("should not remove game if no more players and game is playing", async () => {
      game.players = [player]
      game.status = Constants.GAME_STATUS.PLAYING

      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await game.disconnectPlayer(player)

      expect(removeGameSpy).not.toHaveBeenCalled()

      removeGameSpy.mockClear()
    })

    it("should not remove the game if no players are left (disabled for mobile stability)", async () => {
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

      // Verify removeGame was NOT called (behavior disabled for mobile stability)
      expect(mockOperationManager.removeGame).not.toHaveBeenCalled()
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
  })

  // Add tests for ban feature
  describe("banPlayer", () => {
    it("should add player id to bannedPlayerIds if not already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedPlayerIds).toContain(targetPlayer.id)
      expect(game.bannedPlayerIds.length).toBe(1)
    })

    it("should not add player id to bannedPlayerIds if already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)
      game.bannedPlayerIds.push(targetPlayer.id)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedPlayerIds).toContain(targetPlayer.id)
      expect(game.bannedPlayerIds.length).toBe(1)
    })

    it("should add player name to bannedNames if not already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedNames).toContain(targetPlayer.name)
      expect(game.bannedNames.length).toBe(1)
    })

    it("should not add player name to bannedNames if already included", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)
      game.bannedNames.push(targetPlayer.name)

      // Execute
      game.banPlayer(targetPlayer)

      // Verify
      expect(game.bannedNames).toContain(targetPlayer.name)
      expect(game.bannedNames.length).toBe(1)
    })
  })

  describe("isPlayerBanned", () => {
    it("should return true if player id is in bannedPlayerIds", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)
      game.bannedPlayerIds.push(targetPlayer.id)

      // Execute & Verify
      expect(game.isPlayerBanned(targetPlayer)).toBe(true)
    })

    it("should return true if player name is in bannedNames", () => {
      // Setup
      const targetPlayer = new Player(
        { name: "target", avatar: Constants.AVATARS.BEE },
        "targetSocketId",
      )
      game.addPlayer(targetPlayer)
      game.bannedNames.push(targetPlayer.name)

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
      it("should reset game state and return to lobby", async () => {
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
        expect(
          mockOperationManager.cancelRevealCardsAfkTimer,
        ).toHaveBeenCalledWith(game.code)
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
  })
})
