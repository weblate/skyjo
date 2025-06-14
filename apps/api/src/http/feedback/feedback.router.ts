import { sendFeedback } from "@/http/feedback/feedback.service.js"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { FeedbackError } from "@skymo/shared/constants"
import { feedbackSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

export const feedbackRouter = new Hono().basePath("/feedbacks")

const feedbackRateLimiter = new RateLimiterMemory({
  keyPrefix: "feedback",
  points: 1,
  duration: 15,
})

feedbackRouter.post(
  "/",
  createRateLimiterMiddleware(feedbackRateLimiter),
  zValidator("json", feedbackSchema),
  (c) => {
    try {
      const { email, message } = c.req.valid("json")
      sendFeedback({ email, message })
      return c.json({ success: true })
    } catch (error) {
      Logger.error("Error sending feedback:", { error })
      return c.json(
        { success: false, error: FeedbackError.FEEDBACK_ERROR },
        500,
      )
    }
  },
)
