import type {
  AuthMiddlewareError,
  RateLimitMiddlewareError,
} from "@/types/http/errors/common.js"

export type SendPinError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "send-pin-error"
  | "email-already-sent"

export type VerifyPinError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "invalid-pin"
  | "expired-pin"
  | "verify-pin-error"
