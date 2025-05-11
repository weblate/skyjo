export const UserError = {
  // Registration Errors
  USER_CREATION_FAILED: "user-creation-failed",

  // Unexpected Errors
  UNEXPECTED_ERROR: "unexpected-error",
} as const
export type UserErrorKey = (typeof UserError)[keyof typeof UserError]
