import { CError } from "@skymo/error"
import { Logger } from "@skymo/logger"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ZodError, ZodIssueCode } from "zod"
import { socketErrorWrapper } from "../socketErrorWrapper.js"

// Mock the Logger
vi.mock("@skymo/logger", () => ({
  Logger: {
    cError: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock CError to ensure instanceof checks work correctly
vi.mock("@skymo/error", () => {
  const originalModule = vi.importActual("@skymo/error")
  return {
    ...originalModule,
    CError: class CError extends Error {
      shouldLog: boolean
      constructor(message: string, options: any = {}) {
        super(message)
        this.name = "CError"
        this.shouldLog = options.shouldLog !== false
      }
    },
  }
})

describe("socketErrorWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should execute the handler function without errors", async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).not.toHaveBeenCalled()
    expect(Logger.warn).not.toHaveBeenCalled()
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it("should log CError with shouldLog=true using Logger.cError", async () => {
    const error = new CError("Test error", { shouldLog: true })
    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).toHaveBeenCalledWith(error)
    expect(Logger.warn).not.toHaveBeenCalled()
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it("should not log CError with shouldLog=false", async () => {
    // Create a CError with shouldLog explicitly set to false
    const error = new CError("Test error", { shouldLog: false })

    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).not.toHaveBeenCalled()
    expect(Logger.warn).not.toHaveBeenCalled()
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it("should log ZodError using Logger.warn for each error", async () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: "string",
        received: "number",
        path: ["name"],
        message: "Expected string, received number",
      },
      {
        code: ZodIssueCode.invalid_string,
        validation: "email",
        path: ["email"],
        message: "Invalid email",
      },
    ])

    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).not.toHaveBeenCalled()
    expect(Logger.warn).toHaveBeenCalledTimes(2)
    expect(Logger.warn).toHaveBeenNthCalledWith(
      1,
      "Unexpected error (ZodError instance)",
      { error: error.errors[0] },
    )
    expect(Logger.warn).toHaveBeenNthCalledWith(
      2,
      "Unexpected error (ZodError instance)",
      { error: error.errors[1] },
    )
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it("should log regular Error using Logger.error", async () => {
    const error = new Error("Regular error")
    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).not.toHaveBeenCalled()
    expect(Logger.warn).not.toHaveBeenCalled()
    expect(Logger.error).toHaveBeenCalledWith(
      "Unexpected error (Error instance)",
      { error },
    )
  })

  it("should log unexpected errors using Logger.error", async () => {
    const error = "Not an error object"
    const handler = vi.fn().mockRejectedValue(error)
    const wrappedHandler = socketErrorWrapper(handler)

    await wrappedHandler("arg1", "arg2")

    expect(handler).toHaveBeenCalledWith("arg1", "arg2")
    expect(Logger.cError).not.toHaveBeenCalled()
    expect(Logger.warn).not.toHaveBeenCalled()
    expect(Logger.error).toHaveBeenCalledWith(
      "Unexpected error (unknown error type)",
      { error },
    )
  })
})
