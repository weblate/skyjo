import type { AuthMiddlewareError, RateLimitMiddlewareError } from "./common.js"

export type GetUserError =
  | RateLimitMiddlewareError
  | "user-not-found"
  | "get-user-error"

export type UpdateNameError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "update-name-error"

export type UpdateUsernameError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "update-username-error"
  | "username-taken"

export type UpdateEmailError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "update-email-error"

export type RevertEmailError =
  | RateLimitMiddlewareError
  | "invalid-reversion-token"
  | "expired-reversion-token"
  | "revert-email-error"

export type UpdatePasswordError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "invalid-current-password"
  | "update-password-error"

export type UpdateAvatarError =
  | AuthMiddlewareError
  | RateLimitMiddlewareError
  | "update-avatar-error"

export type DeleteAccountError = AuthMiddlewareError | "delete-account-error"

export type CancelAccountDeletionError =
  | RateLimitMiddlewareError
  | "invalid-cancellation-token"
  | "expired-cancellation-token"
  | "cancel-account-deletion-error"
