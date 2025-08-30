import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import {
  getGameStatusParamsSchema,
  getGameStatusQuerySchema,
  getLeaderboardQuerySchema,
  getPublicGamesQuerySchema,
  kickPlayerBodySchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  getGameStatus,
  getLeaderboard,
  getRedisPublicGames,
  kickPlayer,
} from "@/http/game/game.service.js"
import { authMiddleware } from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"

const publicGamesRateLimiter = new RateLimiterMemory({
  keyPrefix: "public-games",
  points: 20,
  duration: 30,
})

const leaderboardRateLimiter = new RateLimiterMemory({
  keyPrefix: "leaderboard",
  points: 10,
  duration: 60,
})

const gameStatusRateLimiter = new RateLimiterMemory({
  keyPrefix: "game-status",
  points: 30,
  duration: 60,
})

const kickPlayerRateLimiter = new RateLimiterMemory({
  keyPrefix: "kick-player",
  points: 5,
  duration: 60,
})

export const gameRouter = new Hono()
  .get(
    "/public",
    createRateLimiterMiddleware(publicGamesRateLimiter),
    zValidator("query", getPublicGamesQuerySchema),
    async (c) => {
      const query = c.req.valid("query")

      try {
        const games = await getRedisPublicGames(query.nbPerPage, query.page)

        return c.json({ games, page: query.page, length: query.nbPerPage }, 200)
      } catch (error) {
        Logger.error("Error getting public games:", { error })
        return c.json({ error: "get-public-games-error" }, 500)
      }
    },
  )
  .get(
    "/leaderboard",
    createRateLimiterMiddleware(leaderboardRateLimiter),
    zValidator("query", getLeaderboardQuerySchema),
    async (c) => {
      const query = c.req.valid("query")

      try {
        const leaderboard = await getLeaderboard(query.limit)
        return c.json(leaderboard, 200)
      } catch (error) {
        Logger.error("Error getting leaderboard:", { error })
        return c.json({ error: "get-leaderboard-error" }, 500)
      }
    },
  )
  .get(
    "/:code/status",
    createRateLimiterMiddleware(gameStatusRateLimiter),
    zValidator("param", getGameStatusParamsSchema),
    zValidator("query", getGameStatusQuerySchema),
    async (c) => {
      const params = c.req.valid("param")
      const query = c.req.valid("query")

      try {
        const gameStatus = await getGameStatus(params.code, query.playerId)

        if (!gameStatus) {
          return c.json({ error: "game-not-found" }, 404)
        }

        return c.json(gameStatus, 200)
      } catch (error) {
        Logger.error("Error getting game status:", {
          error,
          gameCode: params.code,
        })
        return c.json({ error: "get-game-status-error" }, 500)
      }
    },
  )
  .post(
    "/:code/kick",
    createRateLimiterMiddleware(kickPlayerRateLimiter),
    authMiddleware("ADMIN"),
    zValidator("param", getGameStatusParamsSchema),
    zValidator("json", kickPlayerBodySchema),
    async (c) => {
      const params = c.req.valid("param")
      const body = c.req.valid("json")

      try {
        await kickPlayer(params.code, body.playerId)
        return c.json({ success: true }, 200)
      } catch (error) {
        Logger.error("Error kicking player:", {
          error,
          gameCode: params.code,
          playerId: body.playerId,
        })

        if (error instanceof Error) {
          if (error.message === "Game not found") {
            return c.json({ error: "game-not-found" }, 404)
          }
          if (error.message === "Player not found") {
            return c.json({ error: "player-not-found" }, 404)
          }
        }

        return c.json({ error: "kick-player-error" }, 500)
      }
    },
  )
