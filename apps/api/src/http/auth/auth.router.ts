import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  resetPasswordSchema,
  signupSchema,
  usernameAvailabilitySchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  checkUsernameAvailability,
  completeOnboarding,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  signup,
} from "@/http/auth/auth.service.js"
import { googleRouter } from "@/http/auth/google.router.js"
import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { validateSessionToken } from "@/http/session/session.service.js"

const signupRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 600, // 10 minutes
})

const loginRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60, // 1 minute
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
    "/signup",
    zValidator("json", signupSchema),
    createRateLimiterMiddleware(signupRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      try {
        await signup(c, data)

        return c.json({}, 201)
      } catch (error) {
        Logger.error("Error signing up", { error })
        return c.json({ error: "signup-error" }, 500)
      }
    },
  )
  .post(
    "/login",
    zValidator("json", loginSchema),
    createRateLimiterMiddleware(loginRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      try {
        await login(c, data)

        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 401)
        }

        Logger.error("Error logging in", { error })
        return c.json({ error: "login-error" }, 500)
      }
    },
  )
  .post(
    "/verify",
    createRateLimiterMiddleware(verifyRateLimiter),
    async (c) => {
      const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

      if (!sessionToken) {
        return c.json({ error: "session-token-missing" }, 400)
      }

      try {
        const { session, user } = await validateSessionToken(sessionToken)

        if (!session || !user) {
          await logout(c)
          return c.json({ error: "session-invalid" }, 401)
        }

        return c.json(
          {
            user: {
              emailVerified: user.emailVerified,
              name: user.name,
              username: user.username,
              avatar: user.avatar,
              hasOAuth: !!(user.googleId ?? user.facebookId),
              email: user.email,
              onboardingCompleted: user.onboardingCompleted,
            },
          },
          200,
        )
      } catch (error) {
        Logger.error("Error verifying session", { error })
        return c.json({ error: "verify-session-error" }, 500)
      }
    },
  )
  .post("/logout", authMiddleware, async (c) => {
    try {
      await logout(c)

      return c.json({}, 200)
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 500)
      }

      Logger.error("Error logging out", { error })
      return c.json(
        {
          error: "logout-error",
        },
        500,
      )
    }
  })
  .post(
    "/onboard",
    authMiddleware,
    zValidator("json", onboardingSchema),
    createRateLimiterMiddleware(onboardingRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      try {
        const updatedUser = await completeOnboarding(user.id, data)

        return c.json({ user: updatedUser }, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Error checking username availability", { error })
        return c.json({ error: "onboarding-error" }, 500)
      }
    },
  )
  .post(
    "/check-username",
    authMiddleware,
    zValidator("json", usernameAvailabilitySchema),
    createRateLimiterMiddleware(checkUsernameRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      const user = c.get("user")
      try {
        const available = await checkUsernameAvailability(
          data.username,
          user?.id,
        )

        return c.json({ available }, 200)
      } catch (error) {
        Logger.error("Error checking username availability", { error })
        return c.json({ error: "check-username-error" }, 500)
      }
    },
  )
  .post(
    "/forgot-password",
    zValidator("json", forgotPasswordSchema),
    createRateLimiterMiddleware(forgotPasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      try {
        await requestPasswordReset(data)

        return c.json({}, 200)
      } catch (error) {
        Logger.error("Error requesting password reset", { error })
        return c.json({ error: "forgot-password-error" }, 500)
      }
    },
  )
  .post(
    "/reset-password",
    zValidator("json", resetPasswordSchema),
    createRateLimiterMiddleware(resetPasswordRateLimiter),
    async (c) => {
      const data = c.req.valid("json")
      try {
        await resetPassword(data)

        return c.json({}, 200)
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400)
        }

        Logger.error("Error resetting password", { error })
        return c.json({ error: "reset-password-error" }, 500)
      }
    },
  )

export { authRouter }
