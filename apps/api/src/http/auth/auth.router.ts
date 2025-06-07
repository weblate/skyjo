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
import { AuthError, SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@skymo/shared/validations"
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
  } catch (_e) {
    return c.json(
      {
        success: false,
        error: "An error occurred during signup.",
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

    throw error
  }
})

authRouter.post("/verify", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json(
      {
        success: false,
        error: "Unauthorized",
        reason: "Missing session token",
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
          error: "Unauthorized",
          reason: "Invalid session token",
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
    throw error
  }
})

authRouter.post("/logout", authMiddleware, async (c) => {
  try {
    await logout(c)

    return c.json({}, 200)
  } catch (error) {
    if (error instanceof Error && error.message === AuthError.LOGOUT_FAILED) {
      return c.json(
        {
          success: false,
          message: "An error occurred during logout.",
        },
        500,
      )
    }

    throw error
  }
})

authRouter.get("/me", authMiddleware, async (c) => {
  try {
    const user = await getCurrentUser(c)

    return c.json({ user })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.SESSION_NOT_FOUND
    ) {
      return c.json(
        {
          success: false,
          user: null,
        },
        401,
      )
    } else if (
      error instanceof Error &&
      error.message === AuthError.USER_NOT_FOUND
    ) {
      return c.json(
        {
          success: false,
          user: null,
        },
        404,
      )
    }

    throw error
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
            error: "Username is already taken",
          },
          409,
        )
      }

      return c.json(
        {
          success: false,
          error: "An error occurred during onboarding",
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
    } catch (_error) {
      return c.json(
        {
          success: false,
          error: "An error occurred while checking username availability",
        },
        500,
      )
    }
  },
)

authRouter.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await requestPasswordReset(data)

    return c.json(
      {
        success: true,
        message: "If an account with this email exists, a password reset link has been sent.",
      },
      200,
    )
  } catch (_e) {
    return c.json(
      {
        success: false,
        error: "An error occurred while processing your request.",
      },
      500,
    )
  }
})

authRouter.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await resetPassword(data)

    return c.json(
      {
        success: true,
        message: "Password has been reset successfully.",
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

    return c.json(
      {
        success: false,
        error: "An error occurred while resetting your password.",
      },
      500,
    )
  }
})

export { authRouter }
