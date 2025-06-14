export const HttpError = {
  // Generic Errors
  INTERNAL_SERVER_ERROR: "internal-server-error",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  TOO_MANY_REQUESTS: "too-many-requests",
  IP_NOT_FOUND: "ip-not-found",

  // Validation Errors
  INVALID_REQUEST: "invalid-request",
} as const;
export type HttpError = (typeof HttpError)[keyof typeof HttpError]; 