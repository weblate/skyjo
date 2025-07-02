import { beforeEach, describe, expect, it } from "vitest"
import {
  RANDOM_SOCKET_ID,
  TEST_SOCKET_ID,
} from "../../../tests/constants-test.js"
import { Constants as CoreConstants } from "../../constants.js"
import { Game } from "../Game.js"
import { KickVote } from "../KickVote"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"

describe("KickVote", () => {
  let game: Game
  let player: Player
  let opponent1: Player
  let opponent2: Player

  beforeEach(() => {
    player = new Player(
      { name: "player1", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    game = new Game({ hostId: player.id, settings: new Settings() })
    game.addPlayer(player)

    opponent1 = new Player(
      { name: "opponent1", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    game.addPlayer(opponent1)

    opponent2 = new Player(
      { name: "opponent2", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    game.addPlayer(opponent2)
  })

  it("should create a kick vote", () => {
    const vote = new KickVote({
      targetId: opponent1.id,
      initiatorId: player.id,
      nbConnectedPlayers: game.players.length,
    })

    expect(vote.initiatorId).toBe(player.id)
  })

  describe("addVote", () => {
    it("should add a vote", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      vote.addVote(opponent2.id, true)

      expect(vote["votes"].length).toBe(2)
    })
  })

  describe("hasPlayerVoted", () => {
    it("should check if the player has voted and return false if not", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      expect(vote.hasPlayerVoted(opponent2.id)).toBeFalsy()
    })

    it("should check if the player has voted and return true if yes", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      vote.addVote(opponent2.id, true)

      expect(vote.hasPlayerVoted(opponent2.id)).toBeTruthy()
    })
  })

  describe("getRequiredVotes", () => {
    it("should return the required votes", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      expect(vote.getRequiredVotes()).toBe(2)
    })

    it("should return the required votes for a game with 3 players", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      const player3 = new Player(
        { name: "player3", avatar: CoreConstants.AVATARS.BEE },
        RANDOM_SOCKET_ID(),
      )
      game.addPlayer(player3)

      expect(vote.getRequiredVotes()).toBe(2)
    })
  })

  describe("hasReachedRequiredVotes", () => {
    it("should check if the vote has reached the required votes and return false if not", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      expect(vote.hasReachedRequiredVotes()).toBeFalsy()
    })

    it("should check if the vote has reached the required votes and return true if yes", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      vote.addVote(opponent2.id, true)

      expect(vote.hasReachedRequiredVotes()).toBeTruthy()
    })
  })

  describe("allPlayersVotedExceptTarget", () => {
    it("should check if all players have voted except the target and return false if not", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      expect(vote.allPlayersVotedExceptTarget()).toBeFalsy()
    })

    it("should check if all players have voted except the target and return true if yes", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      vote.addVote(opponent2.id, true)

      expect(vote.allPlayersVotedExceptTarget()).toBeTruthy()
    })
  })

  describe("toJson", () => {
    it("should return the vote in json format", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      const json = vote.toJson()

      expect(json).toEqual({
        targetId: vote["targetId"],
        initiatorId: vote["initiatorId"],
        votes: vote["votes"],
        requiredVotes: vote.getRequiredVotes(),
        expiresAt: vote["expiresAt"],
      })

      expect(json).not.toHaveProperty("game")
      expect(json).not.toHaveProperty("timeout")
    })
  })

  describe("serialize", () => {
    it("should return the vote in serialized format", () => {
      const vote = new KickVote({
        targetId: opponent1.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.players.length,
      })

      const serialized = vote.serialize()

      expect(serialized).toEqual({
        targetId: vote["targetId"],
        initiatorId: vote["initiatorId"],
        votes: vote["votes"],
        nbConnectedPlayers: vote["nbConnectedPlayers"],
      })
    })
  })
})
