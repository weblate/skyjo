import { zValidator } from "@hono/zod-validator"
import { verifyPinSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import {
  type AuthContextVariables,
  authMiddleware,
} from "@/http/middlewares/auth.middleware.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import {
  sendVerifyPin,
  verifyPin,
} from "@/http/userVerification/userVerification.service.js"

const sendVerifyRateLimiter = new RateLimiterMemory({
  keyPrefix: "send-verify",
  points: 5,
  duration: 10,
})

const verifyRateLimiter = new RateLimiterMemory({
  keyPrefix: "verify",
  points: 5,
  duration: 30,
})

export const userVerificationRouter = new Hono<AuthContextVariables>()
  .get(
    "send-pin",
    authMiddleware(),
    createRateLimiterMiddleware(sendVerifyRateLimiter),
    async (c) => {
      const user = c.get("user")
      await sendVerifyPin(user.email)
      return c.json({}, 200)
    },
  )
  .post(
    "try-pin",
    authMiddleware(),
    zValidator("json", verifyPinSchema),
    createRateLimiterMiddleware(verifyRateLimiter),
    async (c) => {
      const user = c.get("user")
      const { pin } = await c.req.json()
      await verifyPin(user.email, pin)
      return c.json({}, 200)
    },
  )
