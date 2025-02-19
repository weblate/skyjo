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
  RoundPhase,
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
      cancelAfkTimer: vi.fn(),
      updateGame: vi.fn(),
      startAfkTimer: vi.fn(),
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
        turnStartTime: new Date(),
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
        turnStartTime: new Date(),
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
    it("should not start the game if min players is not reached", () => {
      game.removePlayer(opponent.id)
      expect(() => game.start()).toThrowCErrorWithCode(
        ErrorConstants.ERROR.TOO_FEW_PLAYERS,
      )
    })

    it("should start the game with default settings", () => {
      game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundRevealCards()).toBeTruthy()
    })

    it("should start the game and set the round status to playing if there is no card to turn at the beginning of the game", () => {
      game.settings.initialTurnedCount = 0
      game.start()

      expect(game.isPlaying()).toBeTruthy()
      expect(game.isRoundInMain()).toBeTruthy()
    })
  })

  describe("revealCard", () => {
    it("should not reveal card if the game is not playing", () => {
      game.status = Constants.GAME_STATUS.LOBBY
      game.revealCard(player, 0, 0)

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard(player, 0, 0)

      expect(player.cards[0][0].isVisible).toBeFalsy()
    })

    it("should not reveal card if the game is not in round turning cards phase", () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.MAIN

      player.cards = [
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
        [new SkyjoCard(10), new SkyjoCard(10), new SkyjoCard(10)],
      ]

      game.revealCard(player, 0, 0)

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

      game.revealCard(player, 0, 0)

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

      game.revealCard(player, 0, 0)

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

      game.revealCard(player, 0, 0)

      expect(player.cards[0][0].isVisible).toBeTruthy()
      expect(game.isRoundInMain()).toBeTruthy()
    })
  })

  describe("drawCard", () => {
    it("should draw card", () => {
      game.start()

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
      game.start()

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
      game.start()

      game["discardPile"] = []

      game.pickFromDiscard()

      expect(game.selectedCardValue).toBeNull()
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
    })

    it("should pick from discard", () => {
      game.start()

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
      game.start()

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
    it("should turn card", () => {
      game.start()
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

  describe("finishTurn", () => {
    it("should finish turn without afk", async () => {
      game.settings.initialTurnedCount = 0
      game.start()
      game.turn = 0
      // act like a replace
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.lastTurnStatus = Constants.LAST_TURN_STATUS.REPLACE
      game.selectedCardValue = null

      await game.finishTurn({ wasAfk: false })

      expect(operationManager.cancelAfkTimer).toHaveBeenCalledTimes(1)
      expect(operationManager.updateGame).toHaveBeenCalledTimes(0)
      expect(player.consecutiveAfkCount).toBe(0)
      expect(game.turn).toBe(1)
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.REPLACE,
      )
      expect(operationManager.startAfkTimer).toHaveBeenCalledTimes(1)
    })

    it("should finish turn with afk", async () => {
      game.settings.initialTurnedCount = 0
      game.start()
      game.turn = 0
      // act like a replace does by afk function
      player.consecutiveAfkCount = 1
      player.afkCount = 1
      game.turnStatus = Constants.TURN_STATUS.REPLACE_A_CARD
      game.lastTurnStatus = Constants.LAST_TURN_STATUS.REPLACE
      game.selectedCardValue = null

      await game.finishTurn({ wasAfk: true })

      expect(operationManager.cancelAfkTimer).toHaveBeenCalledTimes(1)
      expect(operationManager.updateGame).toHaveBeenCalledTimes(0)
      expect(player.consecutiveAfkCount).toBe(1)
      expect(game.turn).toBe(1)
      expect(game.turnStatus).toBe<TurnStatus>(
        Constants.TURN_STATUS.CHOOSE_A_PILE,
      )
      expect(game.lastTurnStatus).toBe<LastTurnStatus>(
        Constants.LAST_TURN_STATUS.REPLACE,
      )
      expect(operationManager.startAfkTimer).toHaveBeenCalledTimes(1)
    })

    it("should finish turn and start a new round", async () => {
      game.status = Constants.GAME_STATUS.PLAYING
      game.roundPhase = Constants.ROUND_PHASE.OVER

      game["nextTurn"] = vi.fn()

      // simulate the call of the function
      operationManager.delayNewRound = vi
        .fn()
        .mockImplementation(() => game["startNewRound"]())

      await game.finishTurn({ wasAfk: false })

      expect(operationManager.cancelAfkTimer).toHaveBeenCalledTimes(1)
      expect(operationManager.updateGame).toHaveBeenCalledTimes(0)
      expect(operationManager.delayNewRound).toHaveBeenCalledTimes(1)
      expect(operationManager.startAfkTimer).toHaveBeenCalledTimes(0)
      expect(game.roundPhase).toBe<RoundPhase>(
        Constants.ROUND_PHASE.REVEAL_CARDS,
      )
    })
  })

  describe("togglePlayerReplay", () => {
    it("should not toggle player replay if player is not in the game", () => {
      game.togglePlayerReplay("playerId")

      expect(player.wantsReplay).toBeFalsy()
    })

    it("should toggle player replay", () => {
      player.wantsReplay = false

      game.togglePlayerReplay(player.id)

      expect(player.wantsReplay).toBeTruthy()
    })

    it("should toggle player replay and start a new game", () => {
      player.wantsReplay = false
      opponent.wantsReplay = true

      game.togglePlayerReplay(player.id)

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
        turnStartTime: game.turnStartTime,
        settings: game.settings.toJson(),
        stateVersion: game.stateVersion,
        updatedAt: game.updatedAt,
      })
    })
  })

  describe("serializeGame", () => {
    it("should serialize game", () => {
      game.start()

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
        turnStartTime: game.turnStartTime,
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
      })
    })
  })
})
