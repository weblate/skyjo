export type RateLimitMiddlewareError = "too-many-requests" | "ip-not-found"

export type AuthMiddlewareError =
  | "session-token-missing"
  | "session-invalid"
  | "internal-server-error"

export type UnexpectedError = "unexpected-error"
