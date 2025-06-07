import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import {
  deleteUser,
  getUserByUsername,
  getUserGames,
  getUserStats,
} from "@/http/user/user.service.js"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

export const userRouter = new Hono<AuthContextVariables>().basePath("/users")

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
const deleteAccountRateLimiter = new RateLimiterMemory({
  keyPrefix: "delete-account",
  points: 1,
  duration: 1,
})
userRouter.delete(
  "/me",
  authMiddleware,
  createRateLimiterMiddleware(deleteAccountRateLimiter),
  async (c) => {
    const user = c.get("user")

    try {
      await deleteUser(user.id)
      return c.json({ success: true })
    } catch (error) {
      Logger.error("Failed to delete account", { error })
      return c.json({ success: false, error: "Failed to delete account" }, 500)
    }
  },
)
