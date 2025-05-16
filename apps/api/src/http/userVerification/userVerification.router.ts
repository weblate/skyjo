import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import {
  sendVerifyPin,
  verifyPin,
} from "@/http/userVerification/userVerification.service.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { verifyPinSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

const userVerificationRouter = new Hono<AuthContextVariables>().basePath(
  "/verification",
)

const sendVerifyRateLimiter = new RateLimiterMemory({
  keyPrefix: "send-verify",
  points: 1,
  duration: 30,
})

const verifyRateLimiter = new RateLimiterMemory({
  keyPrefix: "verify",
  points: 5,
  duration: 30,
})

userVerificationRouter.get(
  "send-pin",
  createRateLimiterMiddleware(sendVerifyRateLimiter),
  authMiddleware,
  async (c) => {
    const user = c.get("user")
    try {
      await sendVerifyPin(user.email)

      return c.json({ success: true })
    } catch (error) {
      Logger.error(`Error when sending a verify email to ${user?.email}`, {
        error,
      })
      return c.json({ success: false }, 500)
    }
  },
)

userVerificationRouter.post(
  "try-pin",
  authMiddleware,
  zValidator("json", verifyPinSchema),
  createRateLimiterMiddleware(verifyRateLimiter),
  async (c) => {
    const user = c.get("user")
    const { pin } = await c.req.json()

    const success = await verifyPin(user.email, pin)

    return c.json({ success })
  },
)

export { userVerificationRouter }
