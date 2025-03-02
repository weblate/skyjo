import { CError } from "@skyjo/error"
import { mockSocket } from "@tests/_mock.js"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { describe, expect, it, vi } from "vitest"
import { consumeSocketRateLimiter } from "../rateLimiter.js"

vi.mock("rate-limiter-flexible", () => ({
  RateLimiterMemory: vi.fn().mockImplementation(() => ({
    consume: vi.fn(),
  })),
}))

describe("rateLimiter", () => {
  describe("consumeSocketRateLimiter", () => {
    it("should consume the rate limiter with the socket id", async () => {
      const rateLimiter = new RateLimiterMemory({ points: 5, duration: 1 })
      const socket = mockSocket("test-socket-id")
      const middleware = consumeSocketRateLimiter(rateLimiter)

      await middleware(socket)

      expect(rateLimiter.consume).toHaveBeenCalledWith("test-socket-id")
    })

    it("should throw a CError when rate limit is exceeded", async () => {
      const rateLimiter = new RateLimiterMemory({ points: 5, duration: 1 })
      const socket = mockSocket("test-socket-id")
      const middleware = consumeSocketRateLimiter(rateLimiter)

      // Mock the consume method to throw an error
      vi.mocked(rateLimiter.consume).mockImplementation(() => {
        throw new Error("Rate limit exceeded")
      })

      // Test that the middleware throws a CError
      await expect(middleware(socket)).rejects.toBeInstanceOf(CError)
      await expect(middleware(socket)).rejects.toThrow("Too Many Requests")

      expect(rateLimiter.consume).toHaveBeenCalledWith("test-socket-id")
    })
  })
})
