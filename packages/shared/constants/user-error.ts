export const UserError = {
  // Registration Errors
  CREATION_FAILED: "user-creation-failed",

  NOT_FOUND: "user-verification-not-found",

  // Unexpected Errors
  UNEXPECTED_ERROR: "unexpected-error",
} as const
export type UserErrorKey = (typeof UserError)[keyof typeof UserError]
