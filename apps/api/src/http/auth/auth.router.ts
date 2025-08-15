import { zValidator } from "@hono/zod-validator"
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  resetPasswordSchema,
  sendVerificationEmailSchema,
  tryVerificationEmailSchema,
  usernameAvailabilitySchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  checkUsernameAvailability,
  completeOnboarding,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  tryVerificationEmail,
} from "@/http/auth/auth.service.js"
import { googleRouter } from "@/http/auth/google.router.js"
import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"

const loginRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 1 minute
})

const sendVerificationEmailRateLimiter = new RateLimiterMemory({
  points: 2,
  duration: 40, // 40 seconds
})
const tryVerifyEmailRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 8,
})

const verifyRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
})

const onboardingRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 1 minute
})

const checkUsernameRateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 600, // 10 minutes
})

const forgotPasswordRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60, // 1 minute
})

const resetPasswordRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60, // 1 minute
})

const authRouter = new Hono<AuthContextVariables>()
  .route("", googleRouter)
  .post(
    "/login",
    zValidator("json", loginSchema),
    createRateLimiterMiddleware(loginRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      await login(c, data)
      return c.json({}, 200)
    },
  )
  .post(
    "/verify",
    authMiddleware(),
    createRateLimiterMiddleware(verifyRateLimiter),
    async (c) => {
      const user = c.get("user")
      return c.json(
        {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            hasOAuth: !!(user.googleId ?? user.facebookId),
            email: user.email,
            onboardingCompleted: user.onboardingCompleted,
            role: user.role,
          },
        },
        200,
      )
    },
  )
  .post(
    "/send-verification-email",
    zValidator("json", sendVerificationEmailSchema),
    createRateLimiterMiddleware(sendVerificationEmailRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      await sendVerificationEmail(data)
      return c.json({}, 200)
    },
  )
  .post(
    "/try-verification-email",
    zValidator("json", tryVerificationEmailSchema),
    createRateLimiterMiddleware(tryVerifyEmailRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const result = await tryVerificationEmail(c, data)

      return c.json(
        {
          user: {
            id: result.user.id,
            name: result.user.name,
            username: result.user.username,
            avatar: result.user.avatar,
            hasOAuth: !!(result.user.googleId ?? result.user.facebookId),
            email: result.user.email,
            onboardingCompleted: result.user.onboardingCompleted,
            role: result.user.role,
          },
          isNewUser: result.isNewUser,
        },
        200,
      )
    },
  )
  .post("/logout", authMiddleware(), async (c) => {
    await logout(c)
    return c.json({}, 200)
  })
  .post(
    "/onboard",
    authMiddleware(),
    zValidator("json", onboardingSchema),
    createRateLimiterMiddleware(onboardingRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      const updatedUser = await completeOnboarding(user.id, data)
      return c.json({ user: updatedUser }, 200)
    },
  )
  .post(
    "/check-username",
    authMiddleware(),
    zValidator("json", usernameAvailabilitySchema),
    createRateLimiterMiddleware(checkUsernameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      const available = await checkUsernameAvailability(data.username, user?.id)
      return c.json({ available }, 200)
    },
  )
  .post(
    "/forgot-password",
    zValidator("json", forgotPasswordSchema),
    createRateLimiterMiddleware(forgotPasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      await requestPasswordReset(data)
      return c.json({}, 200)
    },
  )
  .post(
    "/reset-password",
    zValidator("json", resetPasswordSchema),
    createRateLimiterMiddleware(resetPasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      await resetPassword(data)
      return c.json({}, 200)
    },
  )

export { authRouter }
