import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import {
  updateAvatarSchema,
  updateEmailSchema,
  updateNameSchema,
  updatePasswordSchema,
  updateUsernameSchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import {
  cancelAccountDeletion,
  getUserByUsername,
  getUserGames,
  getUserStats,
  revertEmail,
  scheduleAccountDeletion,
  updateAvatar,
  updateEmail,
  updateName,
  updatePassword,
  updateUsername,
} from "@/http/user/user.service.js"

const userGamesRateLimiter = new RateLimiterMemory({
  keyPrefix: "get-user",
  points: 5,
  duration: 60,
})
const updateNameRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-name",
  points: 5,
  duration: 60,
})
const updateUsernameRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-username",
  points: 1,
  duration: 60,
})
const updateEmailRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-email",
  points: 1,
  duration: 60,
})
const revertEmailRateLimiter = new RateLimiterMemory({
  keyPrefix: "revert-email",
  points: 5,
  duration: 60,
})
const updatePasswordRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-password",
  points: 5,
  duration: 60,
})
const updateAvatarRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-avatar",
  points: 10,
  duration: 15,
})
const cancelAccountDeletionRateLimiter = new RateLimiterMemory({
  keyPrefix: "cancel-account-deletion",
  points: 5,
  duration: 60,
})

export const userRouter = new Hono<AuthContextVariables>()
  .get(
    `/:username`,
    createRateLimiterMiddleware(userGamesRateLimiter),
    async (c) => {
      const username = c.req.param("username")

      try {
        const user = await getUserByUsername(username)
        if (!user) {
          return c.json({ error: "user-not-found" }, 404)
        }

        const gamesPromise = getUserGames(username, {
          limit: 20,
          offset: 0,
        })

        const statsPromise = getUserStats(username)

        const [games, stats] = await Promise.all([gamesPromise, statsPromise])

        return c.json(
          {
            user,
            games,
            stats,
          },
          200,
        )
      } catch (error) {
        Logger.error("Error getting user games:", { error })
        return c.json({ error: "get-user-error" }, 500)
      }
    },
  )
  .patch(
    "/me/name",
    authMiddleware,
    zValidator("json", updateNameSchema),
    createRateLimiterMiddleware(updateNameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")

      try {
        await updateName(user.id, data)

        return c.json({}, 200)
      } catch (error) {
        Logger.error("Failed to update name", { error })
        return c.json({ error: "update-name-error" }, 500)
      }
    },
  )

  .patch(
    "/me/username",
    authMiddleware,
    zValidator("json", updateUsernameSchema),
    createRateLimiterMiddleware(updateUsernameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")

      try {
        await updateUsername(user.id, data)
        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Failed to update username", { error })
        return c.json({ error: "update-username-error" }, 500)
      }
    },
  )
  .patch(
    "/me/email",
    authMiddleware,
    zValidator("json", updateEmailSchema),
    createRateLimiterMiddleware(updateEmailRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")

      try {
        await updateEmail(user, data)
        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Failed to update email", { error })
        return c.json({ error: "update-email-error" }, 500)
      }
    },
  )
  .get(
    "/me/revert-email/:token",
    createRateLimiterMiddleware(revertEmailRateLimiter),
    async (c) => {
      try {
        const token = c.req.param("token")
        await revertEmail(token)

        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Failed to revert email", { error })
        return c.json({ error: "revert-email-error" }, 500)
      }
    },
  )
  .patch(
    "/me/password",
    authMiddleware,
    zValidator("json", updatePasswordSchema),
    createRateLimiterMiddleware(updatePasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")

      try {
        await updatePassword(user.id, data)
        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Failed to update password", { error })
        return c.json({ error: "update-password-error" }, 500)
      }
    },
  )
  .patch(
    "/me/avatar",
    authMiddleware,
    zValidator("json", updateAvatarSchema),
    createRateLimiterMiddleware(updateAvatarRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")

      try {
        await updateAvatar(user.id, data)
        return c.json({}, 200)
      } catch (error) {
        Logger.error("Failed to update avatar", { error })
        return c.json({ error: "unexpected-error" }, 500)
      }
    },
  )
  .post("/me/delete", authMiddleware, async (c) => {
    const user = c.get("user")
    try {
      await scheduleAccountDeletion(user.id)
      return c.json({}, 200)
    } catch (error) {
      Logger.error("Failed to schedule account deletion", { error })
      return c.json({ error: "delete-account-error" }, 500)
    }
  })
  .post(
    "/me/cancel-deletion/:token",
    createRateLimiterMiddleware(cancelAccountDeletionRateLimiter),
    async (c) => {
      try {
        const token = c.req.param("token")
        await cancelAccountDeletion(token)
        return c.json({}, 200)
      } catch (error) {
        Logger.error("Failed to cancel account deletion", { error })
        return c.json({ error: "cancel-account-deletion-error" }, 500)
      }
    },
  )
