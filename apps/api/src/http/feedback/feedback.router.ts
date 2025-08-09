import { zValidator } from "@hono/zod-validator"
import { feedbackSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { sendFeedback } from "@/http/feedback/feedback.service.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"

const feedbackRateLimiter = new RateLimiterMemory({
  keyPrefix: "feedback",
  points: 1,
  duration: 15,
})

export const feedbackRouter = new Hono().post(
  "/",
  zValidator("json", feedbackSchema),
  createRateLimiterMiddleware(feedbackRateLimiter),
  async (c) => {
    const { email, message } = c.req.valid("json")

    sendFeedback({ email, message })

    return c.json({}, 200)
  },
)
