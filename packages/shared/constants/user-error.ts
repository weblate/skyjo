export const UserError = {
  // Registration Errors
  CREATION_FAILED: "user-creation-failed",

  NOT_FOUND: "user-verification-not-found",

  // Update Errors
  USERNAME_TAKEN: "username-taken",
  EMAIL_TAKEN: "email-taken",
  INVALID_CURRENT_PASSWORD: "invalid-current-password",

  // Unexpected Errors
  UNEXPECTED_ERROR: "unexpected-error",
} as const
export type UserErrorKey = (typeof UserError)[keyof typeof UserError]
