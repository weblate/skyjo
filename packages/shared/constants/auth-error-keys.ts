export const AuthErrorKeys = {
  // Registration Errors
  USER_CREATION_FAILED: "user-creation-failed",

  // Login Errors
  LOGIN_INVALID_CREDENTIALS: "invalid-credentials",

  // Logout Errors
  LOGOUT_FAILED: "logout-failed",

  // Session Errors
  SESSION_NOT_FOUND: "session-not-found",
  USER_NOT_FOUND: "user-not-found",

  // OAuth General Errors
  OAUTH_INVALID_CALLBACK_PARAMS: "oauth-invalid-callback-params",
  OAUTH_ID_TOKEN_MISSING: "oauth-id-token-missing",
  OAUTH_PARSE_USER_INFO_FAILED: "oauth-parse-user-info-failed",
  OAUTH_ACCOUNT_CREATION_FAILED: "oauth-account-creation-failed",

  // Generic/Fallback
  UNKNOWN_AUTH_ERROR: "unknown-auth-error",
} as const
export type AuthErrorKey = (typeof AuthErrorKeys)[keyof typeof AuthErrorKeys]
