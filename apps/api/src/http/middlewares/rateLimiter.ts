import { getConnInfo } from "@hono/node-server/conninfo"
import { HttpError } from "@skymo/shared/constants"
import type { Context, Next } from "hono"
import { RateLimiterMemory } from "rate-limiter-flexible"

const createRateLimiterMiddleware = (rateLimiter: RateLimiterMemory) => {
  return async (c: Context, next: Next) => {
    const ip = getConnInfo(c).remote.address

    if (!ip) {
      return c.json({ success: false, error: HttpError.IP_NOT_FOUND }, 400)
    }

    try {
      await rateLimiter.consume(ip)
      await next()
    } catch {
      return c.json({ success: false, error: HttpError.TOO_MANY_REQUESTS }, 429)
    }
  }
}

export { createRateLimiterMiddleware }
