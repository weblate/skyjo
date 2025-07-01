import { sendFeedback } from "@/http/feedback/feedback.service.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { feedbackSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

const feedbackRateLimiter = new RateLimiterMemory({
  keyPrefix: "feedback",
  points: 1,
  duration: 15,
})

export const feedbackRouter = new Hono().post(
  "/",
  zValidator("json", feedbackSchema),
  createRateLimiterMiddleware(feedbackRateLimiter),
  (c) => {
    try {
      const { email, message } = c.req.valid("json")
      sendFeedback({ email, message })
      return c.json({}, 200)
    } catch (error) {
      Logger.error("Error sending feedback:", { error })
      return c.json({ error: "feedback-error" }, 500)
    }
  },
)
