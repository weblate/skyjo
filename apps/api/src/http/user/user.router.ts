import { zValidator } from "@hono/zod-validator"
import {
  updateAnalyticsConsentSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updateNameSchema,
  updatePasswordSchema,
  updateUsernameSchema,
  updateUserSettingsSchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
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
  getUserSettings,
  getUserStats,
  revertEmail,
  scheduleAccountDeletion,
  updateAnalyticsConsent,
  updateAvatar,
  updateEmail,
  updateName,
  updatePassword,
  updateUsername,
  updateUserSettings,
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
const getUserSettingsRateLimiter = new RateLimiterMemory({
  keyPrefix: "get-user-settings",
  points: 30,
  duration: 60,
})
const updateUserSettingsRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-user-settings",
  points: 20,
  duration: 60,
})
const updateAnalyticsConsentRateLimiter = new RateLimiterMemory({
  keyPrefix: "update-analytics-consent",
  points: 10,
  duration: 60,
})

export const userRouter = new Hono<AuthContextVariables>()
  .get(
    `/:username`,
    createRateLimiterMiddleware(userGamesRateLimiter),
    async (c) => {
      const username = c.req.param("username").toLowerCase()

      const user = await getUserByUsername(username)
      if (!user) {
        throw new HTTPException(404, {
          message: "user-not-found",
        })
      }

      const gamesPromise = getUserGames(username, {
        limit: 10,
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
    },
  )
  .get(
    "/me/settings",
    authMiddleware(),
    createRateLimiterMiddleware(getUserSettingsRateLimiter),
    async (c) => {
      const user = c.get("user")
      const settings = await getUserSettings(user.id)
      return c.json({ settings }, 200)
    },
  )
  .put(
    "/me/settings",
    authMiddleware(),
    zValidator("json", updateUserSettingsSchema),
    createRateLimiterMiddleware(updateUserSettingsRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      const settings = await updateUserSettings(user.id, data)
      return c.json({ settings }, 200)
    },
  )
  .patch(
    "/me/name",
    authMiddleware(),
    zValidator("json", updateNameSchema),
    createRateLimiterMiddleware(updateNameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updateName(user.id, data)
      return c.json({}, 200)
    },
  )
  .patch(
    "/me/username",
    authMiddleware(),
    zValidator("json", updateUsernameSchema),
    createRateLimiterMiddleware(updateUsernameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updateUsername(user.id, data)
      return c.json({}, 200)
    },
  )
  .patch(
    "/me/email",
    authMiddleware(),
    zValidator("json", updateEmailSchema),
    createRateLimiterMiddleware(updateEmailRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updateEmail(user, data)
      return c.json({}, 200)
    },
  )
  .get(
    "/me/revert-email/:token",
    createRateLimiterMiddleware(revertEmailRateLimiter),
    async (c) => {
      const token = c.req.param("token")
      await revertEmail(token)
      return c.json({}, 200)
    },
  )
  .patch(
    "/me/password",
    authMiddleware(),
    zValidator("json", updatePasswordSchema),
    createRateLimiterMiddleware(updatePasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updatePassword(user.id, data)
      return c.json({}, 200)
    },
  )
  .patch(
    "/me/avatar",
    authMiddleware(),
    zValidator("json", updateAvatarSchema),
    createRateLimiterMiddleware(updateAvatarRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updateAvatar(user.id, data)
      return c.json({}, 200)
    },
  )
  .patch(
    "/me/analytics-consent",
    authMiddleware(),
    zValidator("json", updateAnalyticsConsentSchema),
    createRateLimiterMiddleware(updateAnalyticsConsentRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      await updateAnalyticsConsent(user.id, data)
      return c.json({}, 200)
    },
  )
  .post("/me/delete", authMiddleware(), async (c) => {
    const user = c.get("user")
    await scheduleAccountDeletion(user.id)
    return c.json({}, 200)
  })
  .post(
    "/me/cancel-deletion/:token",
    createRateLimiterMiddleware(cancelAccountDeletionRateLimiter),
    async (c) => {
      const token = c.req.param("token")
      await cancelAccountDeletion(token)
      return c.json({}, 200)
    },
  )
