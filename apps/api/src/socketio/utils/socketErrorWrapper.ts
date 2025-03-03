import { CError } from "@skyjo/error"
import { Logger } from "@skyjo/logger"
import { ZodError } from "zod"

export function socketErrorWrapper(
  // biome-ignore lint/suspicious/noExplicitAny: any is required for a callback with a dynamic number of arguments
  handler: (...args: any[]) => Promise<void>,
) {
  // biome-ignore lint/suspicious/noExplicitAny: any is required for a callback with a dynamic number of arguments
  return async (...args: any[]) => {
    try {
      await handler(...args)
    } catch (error) {
      if (error instanceof CError) {
        if (error.shouldLog) {
          Logger.cError(error)
        }
      } else if (error instanceof ZodError) {
        const errors = error.errors

        for (const error of errors) {
          Logger.warn("Unexpected error (ZodError instance)", { error })
        }
      } else if (error instanceof Error) {
        Logger.error("Unexpected error (Error instance)", { error })
      } else {
        Logger.error("Unexpected error (unknown error type)", { error })
      }
    }
  }
}
