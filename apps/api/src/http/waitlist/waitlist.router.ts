import { zValidator } from "@hono/zod-validator"
import { waitlistSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { createRateLimiterMiddleware } from "@/http/middlewares/rateLimiter.js"
import { addToWaitlist } from "@/http/waitlist/waitlist.service.js"

const waitlistRateLimiter = new RateLimiterMemory({
  keyPrefix: "waitlist",
  points: 3,
  duration: 60,
})

export const waitlistRouter = new Hono().post(
  "/",
  zValidator("json", waitlistSchema),
  createRateLimiterMiddleware(waitlistRateLimiter),
  async (c) => {
    const { email, firstName } = c.req.valid("json")

    await addToWaitlist({ email, firstName })

    return c.json({}, 201)
  },
)
