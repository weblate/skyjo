import type { Error as ThrownError } from "./constants.js"

type CErrorLevel = "debug" | "info" | "warn" | "error" | "critical"

export interface CErrorOptions {
  code?: ThrownError
  level?: CErrorLevel
  shouldLog?: boolean

  meta?: {
    [key: string]: unknown
  }
}

interface CErrorMeta {
  [key: string]: unknown
}

export class CError extends Error {
  code?: ThrownError
  level?: CErrorLevel = "error"
  stackTrace?: string
  shouldLog?: boolean = true
  meta?: CErrorMeta

  /**
   * @param message - A string describing the error. It cannot be an error code from the Error enum.
   * @param options.code - The error code from the Error enum. This is primarily used to identify the error on the client side.
   * @param options.level - "error" by default.
   * @param options.meta - Additional metadata to be logged with the error.
   */
  constructor(message: string, options: CErrorOptions) {
    super(message)

    const { meta, ...rest } = options
    if (rest.code) this.code = rest.code
    if (rest.level) this.level = rest.level
    if (rest.shouldLog) this.shouldLog = rest.shouldLog

    if (meta) {
      this.meta = meta

      // Capture stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor)
      }
      this.stackTrace = this.stack
    }
  }
}
