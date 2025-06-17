import { getRedisPublicGames } from "@/http/game/game.service.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { getPublicGamesQuerySchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

const publicGamesRateLimiter = new RateLimiterMemory({
  keyPrefix: "public-games",
  points: 20,
  duration: 30,
})
export const gameRouter = new Hono().get(
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
