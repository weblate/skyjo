export type ApiResponse<TData, TError = "unknown"> = TData | { error: TError }

export * from "./errors/auth.js"
export * from "./errors/common.js"
export * from "./errors/feedback.js"
export * from "./errors/game.js"
export * from "./errors/user.js"
export * from "./errors/userVerification.js"
export * from "./games.js"
export * from "./users.js"
