import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import {
  getLeaderboardQuerySchema,
  getPublicGamesQuerySchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  getLeaderboard,
  getRedisPublicGames,
} from "@/http/game/game.service.js"
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
