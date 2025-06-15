import { getRedisPublicGames } from "@/http/game/game.service.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { zValidator } from "@hono/zod-validator"
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

    const games = await getRedisPublicGames(query.nbPerPage, query.page)

    return c.json({ games, page: query.page, length: query.nbPerPage }, 200)
  },
)
