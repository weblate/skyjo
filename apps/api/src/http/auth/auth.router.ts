import { zValidator } from "@hono/zod-validator"
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
import { HTTPException } from "hono/http-exception"
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

      await signup(c, data)
      return c.json({}, 201)
    },
  )
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
    createRateLimiterMiddleware(verifyRateLimiter),
    async (c) => {
      const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

      if (!sessionToken) {
        throw new HTTPException(400, {
          message: "session-token-missing",
        })
      }

      const { session, user } = await validateSessionToken(sessionToken)

      if (!session || !user) {
        await logout(c)
        throw new HTTPException(401, {
          message: "session-invalid",
        })
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
            role: user.role,
          },
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
