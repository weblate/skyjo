import type { RateLimitMiddlewareError } from "./common.js"

export type GetPublicGamesError =
  | RateLimitMiddlewareError
  | "get-public-games-error"
