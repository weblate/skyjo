export const UserError = {
  // Registration Errors
  CREATION_FAILED: "user-creation-failed",
  GET_USER_ERROR: "get-user-error",
  GET_USER_GAMES_ERROR: "get-user-games-error",
  GET_USER_STATS_ERROR: "get-user-stats-error",

  NOT_FOUND: "user-verification-not-found",

  // Update Errors
  USERNAME_TAKEN: "username-taken",
  USERNAME_SAME_AS_CURRENT: "username-same-as-current",
  EMAIL_TAKEN: "email-taken",
  EMAIL_SAME_AS_CURRENT: "email-same-as-current",
  INVALID_CURRENT_PASSWORD: "invalid-current-password",
  UPDATE_NAME_ERROR: "update-name-error",
  UPDATE_USERNAME_ERROR: "update-username-error",
  UPDATE_EMAIL_ERROR: "update-email-error",
  REVERT_EMAIL_ERROR: "revert-email-error",
  UPDATE_PASSWORD_ERROR: "update-password-error",
  UPDATE_AVATAR_ERROR: "update-avatar-error",

  // Deletion Errors
  DELETE_ACCOUNT_ERROR: "delete-account-error",
  CANCEL_DELETE_ACCOUNT_ERROR: "cancel-delete-account-error",

  // Unexpected Errors
  UNEXPECTED_ERROR: "unexpected-error",
} as const
export type UserErrorKey = (typeof UserError)[keyof typeof UserError]
