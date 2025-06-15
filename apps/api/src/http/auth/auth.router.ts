import {
  checkUsernameAvailability,
  completeOnboarding,
  getCurrentUser,
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
import { validateSessionToken } from "@/http/session/session.service.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@skymo/shared/validations"
import {
  onboardingSchema,
  usernameAvailabilitySchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"

const authRouter = new Hono<AuthContextVariables>()
  .route("", googleRouter)
  .post("/signup", zValidator("json", signupSchema), async (c) => {
    const data = c.req.valid("json")
    try {
      await signup(c, data)

      return c.json({}, 201)
    } catch (error) {
      Logger.error("Error signing up", { error })
      return c.json({ error: "signup-error" }, 500)
    }
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
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
  })
  .post("/verify", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

    if (!sessionToken) {
      return c.json({ error: "session-token-missing" }, 401)
    }

    try {
      const { session, user } = await validateSessionToken(sessionToken)

      if (!session || !user) {
        return c.json({ error: "session-invalid" }, 401)
      }

      return c.json(
        {
          user: {
            emailVerified: user.emailVerified,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            hasOAuth: !!(user.googleId || user.facebookId),
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
  })
  .post("/logout", authMiddleware, async (c) => {
    try {
      await logout(c)

      return c.json({}, 200)
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 500)
      }

      Logger.error("Error verifying session", { error })
      return c.json(
        {
          error: "logout-error",
        },
        500,
      )
    }
  })

authRouter
  .get("/me", authMiddleware, async (c) => {
    try {
      const user = await getCurrentUser(c)

      return c.json({ user })
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400)
      }

      Logger.error("Error getting current user", { error })
      return c.json({ error: "get-user-error" }, 500)
    }
  })
  .post(
    "/onboard",
    authMiddleware,
    zValidator("json", onboardingSchema),
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
