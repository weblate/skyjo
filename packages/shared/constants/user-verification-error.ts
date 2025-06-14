export const UserVerificationError = {
  SEND_PIN_ERROR: "send-pin-error",
  VERIFY_PIN_ERROR: "verify-pin-error",
  INVALID_PIN: "invalid-pin",
  EXPIRED_PIN: "expired-pin",
} as const
export type UserVerificationError =
  (typeof UserVerificationError)[keyof typeof UserVerificationError]
