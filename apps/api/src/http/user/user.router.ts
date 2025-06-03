import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import {
  getUserByUsername,
  getUserGames,
  getUserStats,
} from "@/http/user/user.service.js"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

export const userRouter = new Hono().basePath("/users")

const userGamesRateLimiter = new RateLimiterMemory({
  keyPrefix: "get-user",
  points: 5,
  duration: 60,
})

userRouter.get(
  `/:username`,
  createRateLimiterMiddleware(userGamesRateLimiter),
  async (c) => {
    const username = c.req.param("username")

    try {
      const user = await getUserByUsername(username)
      if (!user) {
        return c.json({ error: "not-found" }, 404)
      }

      const gamesPromise = getUserGames(username, {
        limit: 20,
        offset: 0,
      })

      const statsPromise = getUserStats(username)

      const [games, stats] = await Promise.all([gamesPromise, statsPromise])

      return c.json({
        user,
        games,
        stats,
      })
    } catch (_error) {
      return c.json({ error: "unknown" }, 500)
    }
  },
)
