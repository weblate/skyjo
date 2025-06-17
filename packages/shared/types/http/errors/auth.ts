//#region Auth route errors

import type { AuthMiddlewareError, RateLimitMiddlewareError } from "./common.js"

export type SignupError = RateLimitMiddlewareError | "signup-error"

export type LoginError =
  | RateLimitMiddlewareError
  | "login-error"
  | "login-invalid-credentials"

export type VerifyError =
  | RateLimitMiddlewareError
  | "session-token-missing"
  | "session-invalid"
  | "verify-session-error"

export type LogoutError = AuthMiddlewareError | "logout-error"

export type OnboardingError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "onboarding-error"
  | "username-taken"

export type CheckUsernameError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "check-username-error"

export type ForgotPasswordError =
  | RateLimitMiddlewareError
  | "forgot-password-error"

export type ResetPasswordError =
  | "reset-password-error"
  | "reset-token-expired"
  | "reset-token-invalid"

export type OauthLoginError =
  | "oauth-login-initiation-failed"
  | "oauth-restart-process"
  | "oauth-unknown-error"
