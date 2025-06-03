export type ApiResponse<TData, TError = "unknown"> = TData | { error: TError }

export * from "./games.js"
export * from "./users.js"
