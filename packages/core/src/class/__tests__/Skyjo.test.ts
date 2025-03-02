import { Constants as ErrorConstants } from "@skyjo/error"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Skyjo } from "../../class/Skyjo.js"
import { SkyjoCard } from "../../class/SkyjoCard.js"
import { SkyjoPlayer } from "../../class/SkyjoPlayer.js"
import { SkyjoSettings } from "../../class/SkyjoSettings.js"
import {
  Constants,
  GameStatus,
  type LastTurnStatus,
  type TurnStatus,
} from "../../constants.js"
import type { SkyjoDbFormat } from "../../types/skyjo.js"
import "@skyjo/error/test/expect-extend"
import {
  DefaultGameOperationManager,
  GameOperationManagerInterface,
} from "../GameOperationManager.js"

const TEST_SOCKET_ID = "socketId123"
const TOTAL_CARDS = 150
const CARDS_PER_PLAYER = 12

describe("Skyjo", () => {
  let game: Skyjo
  let player: SkyjoPlayer
  let settings: SkyjoSettings
  let opponent: SkyjoPlayer
  let operationManager: GameOperationManagerInterface

  beforeEach(() => {
    player = new SkyjoPlayer(
      { username: "player1", avatar: Constants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    settings = new SkyjoSettings()
    game = new Skyjo({ adminId: player.id, settings })
    operationManager = {
      updateGame: vi.fn(),
      removeGame: vi.fn(),
      startRevealCardsAfkTimer: vi.fn(),
      startPlayerAfkTimer: vi.fn(),
      cancelPlayerAfkTimer: vi.fn(),
      getSocket: vi.fn(),
      kickSocket: vi.fn(),
      delayNewRound: vi.fn(),
    }
    game.setOperationManager(operationManager)
    game.addPlayer(player)

    opponent = new SkyjoPlayer(
      { username: "opponent2", avatar: Constants.AVATARS.ELEPHANT },
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
      const gameDb: SkyjoDbFormat = {
        id: crypto.randomUUID(),
        code: "code",
        adminId: player.id,
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
        players: [],

        settings: {
          isConfirmed: false,
          maxPlayers: 8,
          private: false,
          allowSkyjoForColumn: true,
          allowSkyjoForRow: false,
          initialTurnedCount: 2,
          cardPerRow: 3,
          cardPerColumn: 4,
          scoreToEndGame: 100,
          firstPlayerMultiplierPenalty: 2,
          firstPlayerPenaltyType:
            Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
          firstPlayerFlatPenalty: 0,
        },

        stateVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      game = new Skyjo({ adminId: player.id })
      game.populate(gameDb)

      expect(game.id).toBe(gameDb.id)
      expect(game.code).toBe(gameDb.code)
      expect(game.status).toBe(gameDb.status)
      expect(game.turn).toBe(gameDb.turn)
      expect(game.adminId).toBe(gameDb.adminId)
      expect(structuredClone(game.settings)).toStrictEqual(gameDb.settings)
    })

    it("should populate the class with players", () => {
      const gameDb: SkyjoDbFormat = {
        id: crypto.randomUUID(),
        adminId: player.id,
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
        players: [
          {
            id: crypto.randomUUID(),
            name: "player1",
            avatar: Constants.AVATARS.BEE,
            socketId: TEST_SOCKET_ID,
            connectionStatus: Constants.CONNECTION_STATUS.CONNECTED,
            afkCount: 0,
            consecutiveAfkCount: 0,
            turnStartTime: new Date(),
            score: 10,
            scores: [5, 5],
            wantsReplay: true,
            cards: [
              [new SkyjoCard(0), new SkyjoCard(1), new SkyjoCard(2)],
              [new SkyjoCard(3), new SkyjoCard(4), new SkyjoCard(5)],
              [new SkyjoCard(6), new SkyjoCard(7), new SkyjoCard(8)],
            ],
            hasPlayedLastTurn: false,
          },
        ],

        settings: {
          isConfirmed: true,
          private: true,
          maxPlayers: 8,
          allowSkyjoForColumn: true,
          allowSkyjoForRow: false,
          initialTurnedCount: 2,
          cardPerRow: 3,
          cardPerColumn: 4,
          scoreToEndGame: 100,
          firstPlayerMultiplierPenalty: 2,
          firstPlayerPenaltyType:
            Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
          firstPlayerFlatPenalty: 0,
        },

        stateVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      game = new Skyjo({ adminId: player.id })
      game.populate(gameDb)

      expect(game.id).toBe(gameDb.id)
      expect(game.code).toBe(gameDb.code)
      expect(game.status).toBe(gameDb.status)
      expect(game.turn).toBe(gameDb.turn)
      expect(game.adminId).toBe(gameDb.adminId)
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
      const newPlayer = new SkyjoPlayer(
        { username: "player3", avatar: Constants.AVATARS.TURTLE },
        "socketId789",
      )

      expect(() => game.addPlayer(newPlayer)).not.toThrow()
      expect(game.players).toHaveLength(3)
    })

    it("should not add player if max players is reached", () => {
      settings.maxPlayers = 2
      const newPlayer = new SkyjoPlayer(
        { username: "player3", avatar: Constants.AVATARS.TURTLE },
        "socketId789",
      )

      expect(() => game.addPlayer(newPlayer)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.GAME_IS_FULL,
      )
      expect(game.players).toHaveLength(2)
    })
  })

  describe("removePlayer", () => {
    it("should remove player", async () => {
      await game.removePlayer(player.id)
      expect(game.players).toHaveLength(1)
    })

    it("should remove the player and finish player turn if it's the current player", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.turn = 1
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS

      await game.removePlayer(opponent.id)

      expect(game.players).toHaveLength(1)
      expect(game.turn).toBe(0)
      expect(game.turnStatus).toBe(Constants.TURN_STATUS.CHOOSE_A_PILE)
    })

    it("should remove the player and set the round phase to MAIN if all players have revealed cards", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS

      player.cards = [
        [
          new SkyjoCard(10, false),
          new SkyjoCard(10, true),
          new SkyjoCard(10, true),
        ],
        [
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
        ],
        [
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
        ],
        [
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
          new SkyjoCard(10, false),
        ],
      ]

      opponent.cards = [
        [
          new SkyjoCard(9, false),
          new SkyjoCard(9, true),
          new SkyjoCard(9, true),
        ],
        [
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
        ],
        [
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
        ],
        [
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
          new SkyjoCard(9, false),
        ],
      ]

      await game.removePlayer(opponent.id)

      expect(game.roundPhase).toBe(Constants.ROUND_PHASE.MAIN)
    })
  })

  describe("isAdmin", () => {
    it("should check if the player is admin", () => {
      expect(game.isAdmin(player.id)).toBeTruthy()
      expect(game.isAdmin(opponent.id)).toBeFalsy()
    })
  })

  describe("changeAdmin", () => {
    it("should not change admin if there is no connected players", () => {
      for (const player of game.players) {
        player.connectionStatus = Constants.CONNECTION_STATUS.DISCONNECTED
      }

      game.changeAdmin()
      expect(game.adminId).toBe(player.id)
    })

    it("should change admin", () => {
      game.changeAdmin()
      expect(game.adminId).toBe(opponent.id)
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
      expect(game.isRoundInMain()).toBe(false)
      expect(game.isRoundInLastLap()).toBe(false)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies main phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.MAIN
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundInMain()).toBe(true)
      expect(game.isRoundInLastLap()).toBe(false)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies last lap phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.LAST_LAP
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundInMain()).toBe(false)
      expect(game.isRoundInLastLap()).toBe(true)
      expect(game.isRoundOver()).toBe(false)
    })

    it("correctly identifies over phase", () => {
      game.roundPhase = Constants.ROUND_PHASE.OVER
      expect(game.isRoundRevealCards()).toBe(false)
      expect(game.isRoundInMain()).toBe(false)
      expect(game.isRoundInLastLap()).toBe(false)
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
      game.removePlayer(player.id)
      expect(game.hasMinPlayersConnected()).toBeFalsy()
    })
  })

  describe("start", () => {
    it("should not start the game if min players is not reached", async () => {
      game.removePlayer(opponent.id)
      await expect(game.start()).toThrowCErrorWithCode(
        ErrorConstants.ERROR.TOO_FEW_PLAYERS,
      )
    })

    it("should start the game with default settings", async () => {
      await game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundRevealCards()).toBeTruthy()
    })

    it("should start the game and set the round status to playing if there is no card to turn at the beginning of the game", () => {
      game.settings.initialTurnedCount = 0
      await game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundInMain()).toBeTruthy()
    })
  })

  describe("revealCard", () => {
    it("should not reveal card if the game is not playing", () => {
      game.status = Constants.GAME_STATUS.LOBBY
      game.revealCard({ player, column: 0, row: 0 })

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard({ player, column: 0, row: 0 })

      expect(player.cards[0][0].isVisible).toBeFalsy()
    })

    it("should not reveal card if the game is not in round turning cards phase", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.MAIN

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard({ player, column: 0, row: 0 })

      expect(player.cards[0][0].isVisible).toBeFalsy()
    })

    it("should not reveal card if player has already revealed the card count", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10, true), new SkyjoCard(10, true)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard({ player, column: 0, row: 0 })

      expect(player.cards[0][0].isVisible).toBeFalsy()
    })

    it("should reveal a card", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard({ player, column: 0, row: 0 })

      expect(player.cards[0][0].isVisible).toBeTruthy()
    })

    it("should reveal a card and start round in main phase", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.REVEAL_CARDS
      game.settings.initialTurnedCount = 2

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10, true), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]
      opponent.cards = [
        [new SkyjoCard(10, true), new SkyjoCard(10, true), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard({ player, column: 0, row: 0 })

      expect(player.cards[0][0].isVisible).toBeTruthy()
      expect(game.isRoundInMain()).toBeTruthy()
    })
  })

  describe("drawCard", () => {
    it("should draw card", () => {
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

    it("should draw card and reload the draw pile", () => {
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
    it("should not pick from discard if there is no card in the discard pile", () => {
      await game.start()

      game["discardPile"] = []

      game.pickFromDiscard()

      expect(game.selectedCardValue).toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
    })

    it("should pick from discard", () => {
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
    it("should replace a card", () => {
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
    it("should not toggle player replay if player is not in the game", async () => {
      await game.togglePlayerReplay("playerId")

      expect(player.wantsReplay).toBeFalsy()
    })

    it("should toggle player replay", async () => {
      player.wantsReplay = false

      await game.togglePlayerReplay(player.id)

      expect(player.wantsReplay).toBeTruthy()
    })

    it("should toggle player replay and start a new game", async () => {
      player.wantsReplay = false
      opponent.wantsReplay = true

      await game.togglePlayerReplay(player.id)

      expect(player.wantsReplay).toBeFalsy()
      expect(opponent.wantsReplay).toBeFalsy()
      expect(game.status).toBe<GameStatus>(Constants.GAME_STATUS.LOBBY)
      expect(game.stateVersion).toBe(0)
      expect(game.players.length).toBe(2)
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
        adminId: player.id,
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
    it("should serialize game", () => {
      await game.start()

      const gameSerialized = game.serializeGame()
      expect(gameSerialized).toStrictEqual({
        id: game.id,
        adminId: player.id,
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
        players: [
          {
            id: player.id,
            name: player.name,
            avatar: Constants.AVATARS.BEE,
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
          },
          {
            id: opponent.id,
            name: opponent.name,
            avatar: Constants.AVATARS.ELEPHANT,
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
          },
        ],
        settings: {
          isConfirmed: false,
          allowSkyjoForColumn: true,
          allowSkyjoForRow: false,
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
        },
        stateVersion: game.stateVersion,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      } satisfies SkyjoDbFormat)
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

      expect(player.scores[0]).toBe(20)
    })

    it("should apply flat penalty when penalty type is FLAT_ONLY", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_ONLY
      game.settings.firstPlayerFlatPenalty = 5

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toBe(15)
    })

    it("should apply flat then multiplier penalty when penalty type is FLAT_THEN_MULTIPLIER", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.FLAT_THEN_MULTIPLIER
      game.settings.firstPlayerFlatPenalty = 5
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toBe(30) // (10 + 5) * 2
    })

    it("should apply multiplier then flat penalty when penalty type is MULTIPLIER_THEN_FLAT", () => {
      game.settings.firstPlayerPenaltyType =
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_THEN_FLAT
      game.settings.firstPlayerFlatPenalty = 5
      game.settings.firstPlayerMultiplierPenalty = 2

      game["checkFirstPlayerPenalty"]()

      expect(player.scores[0]).toBe(25) // (10 * 2) + 5
    })
  })

  describe("hasPlayerFinished", () => {
    it("should return true when all player cards are visible", () => {
      player.cards = [
        [new SkyjoCard(1, true), new SkyjoCard(2, true)],
        [new SkyjoCard(3, true), new SkyjoCard(4, true)],
      ]

      const result = game["hasPlayerFinished"](player)

      expect(result).toBe(true)
    })

    it("should return false when not all player cards are visible", () => {
      player.cards = [
        [new SkyjoCard(1, true), new SkyjoCard(2, false)],
        [new SkyjoCard(3, true), new SkyjoCard(4, true)],
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
      const thirdPlayer = new SkyjoPlayer(
        { username: "player3", avatar: Constants.AVATARS.TURTLE },
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
    it("should discard cards when allowSkyjoForColumn is true and there are columns to discard", () => {
      game.settings.allowSkyjoForColumn = true
      game.settings.allowSkyjoForRow = false

      const columnsToDiscard = [
        new SkyjoCard(5),
        new SkyjoCard(5),
        new SkyjoCard(5),
      ]

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

    it("should discard cards when allowSkyjoForRow is true and there are rows to discard", () => {
      game.settings.allowSkyjoForColumn = false
      game.settings.allowSkyjoForRow = true

      const rowsToDiscard = [
        new SkyjoCard(7),
        new SkyjoCard(7),
        new SkyjoCard(7),
      ]

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
      game.settings.allowSkyjoForColumn = true
      game.settings.allowSkyjoForRow = true

      const columnsToDiscard = [new SkyjoCard(5), new SkyjoCard(5)]
      const rowsToDiscard = [new SkyjoCard(7), new SkyjoCard(7)]

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
      game.settings.allowSkyjoForColumn = true
      game.settings.allowSkyjoForRow = true

      vi.spyOn(player, "checkColumnsAndDiscard").mockReturnValue([])
      vi.spyOn(player, "checkRowsAndDiscard").mockReturnValue([])

      const discardCardSpy = vi.spyOn(game, "discardCard")

      game["checkCardsToDiscard"](player)

      expect(discardCardSpy).not.toHaveBeenCalled()
    })

    it("should recursively check for more cards to discard", () => {
      game.settings.allowSkyjoForColumn = true
      game.settings.allowSkyjoForRow = false

      // First call returns cards, second call returns empty array
      const firstCallCards = [new SkyjoCard(5), new SkyjoCard(5)]
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
        [
          new SkyjoCard(1, true),
          new SkyjoCard(2, true),
          new SkyjoCard(3, false),
        ],
        [
          new SkyjoCard(4, false),
          new SkyjoCard(5, false),
          new SkyjoCard(6, false),
        ],
      ]

      opponent.cards = [
        [
          new SkyjoCard(7, true),
          new SkyjoCard(8, true),
          new SkyjoCard(9, false),
        ],
        [
          new SkyjoCard(10, false),
          new SkyjoCard(11, false),
          new SkyjoCard(12, false),
        ],
      ]

      const result = game["haveAllPlayersRevealedCards"]()

      expect(result).toBe(true)
    })

    it("should return false when not all players have revealed the required number of cards", () => {
      game.settings.initialTurnedCount = 2

      player.cards = [
        [
          new SkyjoCard(1, true),
          new SkyjoCard(2, true),
          new SkyjoCard(3, false),
        ],
        [
          new SkyjoCard(4, false),
          new SkyjoCard(5, false),
          new SkyjoCard(6, false),
        ],
      ]

      opponent.cards = [
        [
          new SkyjoCard(7, true),
          new SkyjoCard(8, false),
          new SkyjoCard(9, false),
        ],
        [
          new SkyjoCard(10, false),
          new SkyjoCard(11, false),
          new SkyjoCard(12, false),
        ],
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
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
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
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
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
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
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
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
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
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
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
    beforeEach(() => {
      vi.spyOn(game["operationManager"], "getSocket").mockReturnValue(undefined)
      vi.spyOn(game["operationManager"], "kickSocket").mockResolvedValue()
      vi.spyOn(game["operationManager"], "removeGame").mockResolvedValue()
      vi.spyOn(game, "removePlayer").mockResolvedValue()
    })

    it("should set player connection status to disconnected", async () => {
      const player = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      game.players = [player]

      await game.disconnectPlayer(player)

      expect(player.connectionStatus).toBe(
        Constants.CONNECTION_STATUS.DISCONNECTED,
      )
    })

    it("should change admin if disconnected player is admin", async () => {
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]
      game.adminId = player1.id

      const changeAdminSpy = vi.spyOn(game, "changeAdmin")

      await game.disconnectPlayer(player1)

      expect(changeAdminSpy).toHaveBeenCalled()
    })

    it("should kick socket if it exists", async () => {
      const player = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
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
    })

    it("should remove player if game is not playing", async () => {
      const player = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      game.players = [player]
      game.status = Constants.GAME_STATUS.LOBBY

      const removePlayerSpy = vi.spyOn(game, "removePlayer")

      await game.disconnectPlayer(player)

      expect(removePlayerSpy).toHaveBeenCalledWith(player.id)
    })

    it("should stop game and remove it if not enough connected players", async () => {
      const player1 = new SkyjoPlayer(
        { username: "Player1", avatar: Constants.AVATARS.BEE },
        "socket1",
      )
      const player2 = new SkyjoPlayer(
        { username: "Player2", avatar: Constants.AVATARS.BEE },
        "socket2",
      )

      game.players = [player1, player2]
      game.status = Constants.GAME_STATUS.PLAYING

      // Mock hasMinPlayersConnected to return false
      vi.spyOn(game, "hasMinPlayersConnected").mockReturnValue(false)

      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await game.disconnectPlayer(player1)

      expect(game.status).toBe(Constants.GAME_STATUS.STOPPED)
      expect(removeGameSpy).toHaveBeenCalledWith(game.code)
    })
  })
})
