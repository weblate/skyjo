export const AuthError = {
  // Login Errors
  LOGIN_INVALID_CREDENTIALS: "invalid-credentials",

  // Logout Errors
  LOGOUT_FAILED: "logout-failed",

  // Session Errors
  SESSION_NOT_FOUND: "session-not-found",
  USER_NOT_FOUND: "user-not-found",
  SESSION_INVALID: "session-invalid",
  SESSION_EXPIRED: "session-expired",
  SESSION_TOKEN_MISSING: "session-token-missing",

  // Onboarding Errors
  USERNAME_TAKEN: "username-taken",
  ONBOARDING_ERROR: "onboarding-error",

  // Password Reset Errors
  RESET_TOKEN_INVALID: "reset-token-invalid",
  RESET_TOKEN_EXPIRED: "reset-token-expired",
  PASSWORD_RESET_FAILED: "password-reset-failed",
  FORGOT_PASSWORD_ERROR: "forgot-password-error",
  RESET_PASSWORD_ERROR: "reset-password-error",

  // OAuth General Errors
  OAUTH_RESTART_PROCESS: "oauth-restart-process",
  OAUTH_ID_TOKEN_MISSING: "oauth-id-token-missing",
  OAUTH_ACCOUNT_CREATION_FAILED: "oauth-account-creation-failed",
  OAUTH_LOGIN_INITIATION_FAILED: "oauth-login-initiation-failed",

  // Verification Errors
  VERIFY_SESSION_ERROR: "verify-session-error",

  // Generic/Fallback
  SIGNUP_ERROR: "signup-error",
  LOGIN_ERROR: "login-error",
  LOGOUT_ERROR: "logout-error",
  CHECK_USERNAME_ERROR: "check-username-error",
  UNKNOWN_AUTH_ERROR: "unknown-auth-error",
} as const
export type AuthError = (typeof AuthError)[keyof typeof AuthError]

export const SESSION_COOKIE_NAME = "skymo_session_id"
