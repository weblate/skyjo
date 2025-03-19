import { Card, Constants as CoreConstants, Game, Player } from "@skymo/core"
import { beforeEach, describe, expect, it } from "vitest"
import { GameStateTracker } from "../GameStateTracker.js"

describe("GameStateTracker", () => {
  let game: Game
  let manager: GameStateTracker

  beforeEach(() => {
    const player = new Player()
    game = new Game({ hostId: player.id })
    game.addPlayer(player)
    game.stateVersion = 1
    manager = new GameStateTracker(game)
  })

  describe("getChanges", () => {
    it("returns null when no changes", () => {
      expect(manager.getChanges()).toBeNull()
      expect(game.stateVersion).toBe(1)
    })

    describe("detects basic field changes", () => {
      it("detects one basic field change", () => {
        game.status = CoreConstants.GAME_STATUS.PLAYING

        expect(manager.getChanges()).toEqual({
          game: {
            status: CoreConstants.GAME_STATUS.PLAYING,
            stateVersion: 2,
          },
        })
        expect(game.stateVersion).toBe(2)
      })

      it("detects multiple basic field changes", () => {
        game.status = CoreConstants.GAME_STATUS.PLAYING
        game.roundPhase = CoreConstants.ROUND_PHASE.MAIN
        game.turn = 1

        expect(manager.getChanges()).toEqual({
          game: {
            status: CoreConstants.GAME_STATUS.PLAYING,
            roundPhase: CoreConstants.ROUND_PHASE.MAIN,
            turn: 1,
            stateVersion: 2,
          },
        })
        expect(game.stateVersion).toBe(2)
      })
    })

    describe("detects settings changes", () => {
      it("detects one settings change", () => {
        game.settings.maxPlayers = 6

        expect(manager.getChanges()).toEqual({
          settings: { maxPlayers: 6 },
          game: { stateVersion: 2 },
        })
        expect(game.stateVersion).toBe(2)
      })

      it("detects multiple settings changes", () => {
        game.settings.removeIdenticalColumn = false
        game.settings.removeIdenticalRow = true
        game.settings.initialTurnedCount = 10

        expect(manager.getChanges()).toEqual({
          settings: {
            removeIdenticalColumn: false,
            removeIdenticalRow: true,
            initialTurnedCount: 10,
          },
          game: { stateVersion: 2 },
        })
        expect(game.stateVersion).toBe(2)
      })
    })

    describe("detects players changes", () => {
      it("detects one basic player change", () => {
        const player = game.players[0]
        player.score = 10

        expect(manager.getChanges()).toEqual({
          updatePlayers: [{ id: player.id, score: 10 }],
          game: { stateVersion: 2 },
        })
        expect(game.stateVersion).toBe(2)
      })

      it("detects multiple basic player changes", () => {
        const player = game.players[0]
        player.score = 10
        player.name = "John"
        player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST
        player.cards = [[new Card(1)], [new Card(2)]]

        expect(manager.getChanges()).toEqual({
          updatePlayers: [
            {
              id: player.id,
              score: 10,
              name: "John",
              connectionStatus: CoreConstants.CONNECTION_STATUS.LOST,
              cards: player.cards.map((row) =>
                row.map((card) => card.toJson()),
              ),
            },
          ],
          game: { stateVersion: 2 },
        })
        expect(game.stateVersion).toBe(2)
      })

      it("detects player additions", () => {
        const newPlayer = new Player()
        game.players.push(newPlayer)

        expect(manager.getChanges()).toEqual({
          addPlayers: [newPlayer.toJson()],
          game: { stateVersion: 2 },
        })
        expect(game.stateVersion).toBe(2)
      })

      it("detects player removals", () => {
        const aPlayer = new Player()
        game.addPlayer(aPlayer)
        manager.getChanges()

        game.removePlayer(aPlayer.id)

        expect(manager.getChanges()).toEqual({
          removePlayers: [aPlayer.id],
          game: { stateVersion: 3 },
        })
        expect(game.stateVersion).toBe(3)
      })
    })
  })
})
