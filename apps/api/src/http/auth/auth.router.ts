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
import {
  AuthError,
  SESSION_COOKIE_NAME,
  UserError,
} from "@skymo/shared/constants"
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

const authRouter = new Hono<AuthContextVariables>().basePath("/auth")
authRouter.route("", googleRouter)

authRouter.post("/signup", zValidator("json", signupSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await signup(c, data)

    return c.json(
      {
        success: true,
      },
      201,
    )
  } catch (error) {
    Logger.error("Error signing up", { error })
    return c.json(
      {
        success: false,
        error: AuthError.SIGNUP_ERROR,
      },
      500,
    )
  }
})

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await login(c, data)

    return c.json(
      {
        success: true,
      },
      200,
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.LOGIN_INVALID_CREDENTIALS
    ) {
      return c.json(
        {
          success: false,
          error: AuthError.LOGIN_INVALID_CREDENTIALS,
        },
        401,
      )
    }

    Logger.error("Error logging in", { error })
    return c.json(
      {
        success: false,
        error: AuthError.LOGIN_ERROR,
      },
      500,
    )
  }
})

authRouter.post("/verify", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json(
      {
        success: false,
        error: AuthError.SESSION_TOKEN_MISSING,
      },
      401,
    )
  }

  try {
    const { session, user } = await validateSessionToken(sessionToken)

    if (!session || !user) {
      return c.json(
        {
          success: false,
          error: AuthError.SESSION_INVALID,
        },
        401,
      )
    }

    return c.json(
      {
        success: true,
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
    return c.json(
      {
        success: false,
        error: AuthError.VERIFY_SESSION_ERROR,
      },
      500,
    )
  }
})

authRouter.post("/logout", authMiddleware, async (c) => {
  try {
    await logout(c)

    return c.json({ success: true }, 200)
  } catch (error) {
    if (error instanceof Error && error.message === AuthError.LOGOUT_FAILED) {
      return c.json(
        {
          success: false,
          error: AuthError.LOGOUT_FAILED,
        },
        500,
      )
    }

    Logger.error("Error verifying session", { error })
    return c.json(
      {
        success: false,
        error: AuthError.LOGOUT_ERROR,
      },
      500,
    )
  }
})

authRouter.get("/me", authMiddleware, async (c) => {
  try {
    const user = await getCurrentUser(c)

    return c.json({ user, success: true })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.SESSION_NOT_FOUND
    ) {
      return c.json(
        {
          success: false,
          error: AuthError.SESSION_NOT_FOUND,
        },
        401,
      )
    }
    if (error instanceof Error && error.message === UserError.NOT_FOUND) {
      return c.json(
        {
          success: false,
          error: UserError.NOT_FOUND,
        },
        404,
      )
    }

    Logger.error("Error getting current user", { error })
    return c.json(
      {
        success: false,
        error: UserError.GET_USER_ERROR,
      },
      500,
    )
  }
})

authRouter.post(
  "/onboard",
  authMiddleware,
  zValidator("json", onboardingSchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")
    try {
      const updatedUser = await completeOnboarding(user.id, data)

      return c.json(
        {
          success: true,
          user: updatedUser,
        },
        200,
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === AuthError.USERNAME_TAKEN
      ) {
        return c.json(
          {
            success: false,
            error: AuthError.USERNAME_TAKEN,
          },
          400,
        )
      }

      Logger.error("Error checking username availability", { error })
      return c.json(
        {
          success: false,
          error: AuthError.ONBOARDING_ERROR,
        },
        500,
      )
    }
  },
)

authRouter.post(
  "/check-username",
  authMiddleware,
  zValidator("json", usernameAvailabilitySchema),
  async (c) => {
    const data = c.req.valid("json")
    const user = c.get("user")
    try {
      const available = await checkUsernameAvailability(data.username, user?.id)

      return c.json(
        {
          success: true,
          available,
        },
        200,
      )
    } catch (error) {
      Logger.error("Error checking username availability", { error })
      return c.json(
        {
          success: false,
          error: AuthError.CHECK_USERNAME_ERROR,
        },
        500,
      )
    }
  },
)

authRouter.post(
  "/forgot-password",
  zValidator("json", forgotPasswordSchema),
  async (c) => {
    const data = c.req.valid("json")
    try {
      await requestPasswordReset(data)

      return c.json(
        {
          success: true,
        },
        200,
      )
    } catch (error) {
      Logger.error("Error requesting password reset", { error })
      return c.json(
        {
          success: false,
          error: AuthError.FORGOT_PASSWORD_ERROR,
        },
        500,
      )
    }
  },
)

authRouter.post(
  "/reset-password",
  zValidator("json", resetPasswordSchema),
  async (c) => {
    const data = c.req.valid("json")
    try {
      await resetPassword(data)

      return c.json(
        {
          success: true,
        },
        200,
      )
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === AuthError.RESET_TOKEN_INVALID ||
          error.message === AuthError.RESET_TOKEN_EXPIRED)
      ) {
        return c.json(
          {
            success: false,
            error: error.message,
          },
          400,
        )
      }

      Logger.error("Error resetting password", { error })
      return c.json(
        {
          success: false,
          error: AuthError.RESET_PASSWORD_ERROR,
        },
        500,
      )
    }
  },
)

export { authRouter }
