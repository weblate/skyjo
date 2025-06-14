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
  updateUserAvatar,
  updateUserEmail,
  updateUserName,
  updateUserPassword,
  updateUserUsername,
} from "@/http/user/user.service.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { UserError } from "@skymo/shared/constants"
import {
  updateAvatarSchema,
  updateEmailSchema,
  updateNameSchema,
  updatePasswordSchema,
  updateUsernameSchema,
} from "@skymo/shared/validations"
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
        return c.json({ success: false, error: UserError.NOT_FOUND }, 404)
      }

      const gamesPromise = getUserGames(username, {
        limit: 20,
        offset: 0,
      })

      const statsPromise = getUserStats(username)

      const [games, stats] = await Promise.all([gamesPromise, statsPromise])

      return c.json({
        success: true,
        user,
        games,
        stats,
      })
    } catch (error) {
      Logger.error("Error getting user games:", { error })
      return c.json({ success: false, error: UserError.GET_USER_ERROR }, 500)
    }
  },
)

const updateNameRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-name",
  points: 5,
  duration: 60,
})
userRouter.patch(
  "/me/name",
  authMiddleware,
  createRateLimiterMiddleware(updateNameRateLimiter),
  zValidator("json", updateNameSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")

    try {
      const updatedUser = await updateUserName(user.id, data)
      return c.json({ success: true, user: updatedUser })
    } catch (error) {
      Logger.error("Failed to update name", { error })
      return c.json({ success: false, error: UserError.UPDATE_NAME_ERROR }, 500)
    }
  },
)

const updateUsernameRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-username",
  points: 1,
  duration: 60,
})
userRouter.patch(
  "/me/username",
  authMiddleware,
  createRateLimiterMiddleware(updateUsernameRateLimiter),
  zValidator("json", updateUsernameSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")

    try {
      const updatedUser = await updateUserUsername(user.id, data)
      return c.json({ success: true, user: updatedUser })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === UserError.USERNAME_TAKEN
      ) {
        return c.json({ success: false, error: UserError.USERNAME_TAKEN }, 400)
      }

      Logger.error("Failed to update username", { error })
      return c.json(
        { success: false, error: UserError.UPDATE_USERNAME_ERROR },
        500,
      )
    }
  },
)

const updateEmailRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-email",
  points: 1,
  duration: 60,
})
userRouter.patch(
  "/me/email",
  authMiddleware,
  createRateLimiterMiddleware(updateEmailRateLimiter),
  zValidator("json", updateEmailSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")

    try {
      const updatedUser = await updateUserEmail(user, data)
      return c.json({ success: true, user: updatedUser })
    } catch (error) {
      if (error instanceof Error && error.message === UserError.EMAIL_TAKEN) {
        return c.json({ success: false, error: UserError.EMAIL_TAKEN }, 400)
      }

      Logger.error("Failed to update email", { error })
      return c.json(
        { success: false, error: UserError.UPDATE_EMAIL_ERROR },
        500,
      )
    }
  },
)

const revertEmailRateLimiter = new RateLimiterMemory({
  keyPrefix: "revert-email",
  points: 5,
  duration: 60,
})
userRouter.get(
  "/me/revert-email/:token",
  createRateLimiterMiddleware(revertEmailRateLimiter),
  async (c) => {
    try {
      const token = c.req.param("token")
      await revertEmail(token)
      return c.json({ success: true })
    } catch (error) {
      Logger.error("Failed to revert email", { error })
      return c.json(
        { success: false, error: UserError.REVERT_EMAIL_ERROR },
        400,
      )
    }
  },
)

const updatePasswordRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-password",
  points: 5,
  duration: 60,
})
userRouter.patch(
  "/me/password",
  authMiddleware,
  createRateLimiterMiddleware(updatePasswordRateLimiter),
  zValidator("json", updatePasswordSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")

    try {
      const updatedUser = await updateUserPassword(user.id, data)
      return c.json({ success: true, user: updatedUser })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === UserError.INVALID_CURRENT_PASSWORD
      ) {
        return c.json(
          { success: false, error: UserError.INVALID_CURRENT_PASSWORD },
          400,
        )
      }

      Logger.error("Failed to update password", { error })
      return c.json(
        { success: false, error: UserError.UPDATE_PASSWORD_ERROR },
        500,
      )
    }
  },
)

const updateAvatarRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-avatar",
  points: 10,
  duration: 15,
})
userRouter.patch(
  "/me/avatar",
  authMiddleware,
  createRateLimiterMiddleware(updateAvatarRateLimiter),
  zValidator("json", updateAvatarSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")

    try {
      const updatedUser = await updateUserAvatar(user.id, data)
      return c.json({ success: true, user: updatedUser })
    } catch (error) {
      Logger.error("Failed to update avatar", { error })
      return c.json(
        { success: false, error: UserError.UPDATE_AVATAR_ERROR },
        500,
      )
    }
  },
)

userRouter.post("/me/delete-account", authMiddleware, async (c) => {
  const user = c.get("user")
  try {
    await scheduleAccountDeletion(user.id)
    return c.json({ success: true })
  } catch (error) {
    Logger.error("Failed to schedule account deletion", { error })
    return c.json(
      { success: false, error: UserError.DELETE_ACCOUNT_ERROR },
      500,
    )
  }
})

const cancelAccountDeletionRateLimiter = new RateLimiterMemory({
  keyPrefix: "cancel-account-deletion",
  points: 5,
  duration: 60,
})
userRouter.post(
  "/cancel-account-deletion/:token",
  createRateLimiterMiddleware(cancelAccountDeletionRateLimiter),
  async (c) => {
    try {
      const token = c.req.param("token")
      await cancelAccountDeletion(token)
      return c.json({ success: true })
    } catch (error) {
      Logger.error("Failed to cancel account deletion", { error })
      return c.json(
        { success: false, error: UserError.CANCEL_DELETE_ACCOUNT_ERROR },
        400,
      )
    }
  },
)
