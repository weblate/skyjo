import { vi } from "vitest"
import "@skymo/error/test/expect-extend"

// Mock BullMQ to prevent actual Redis connections
vi.mock("bullmq", () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
    })),
    Job: vi.fn().mockImplementation((_, data) => ({
      data,
      id: "test-job-id",
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToCompleted: vi.fn().mockResolvedValue(undefined),
      token: "test-token",
    })),
  }
})

vi.spyOn(process, "env", "get").mockReturnValue({
  NODE_ENV: "test",
  APP_NAME: "skymo-api",
  ORIGINS: "e",
  GMAIL_EMAIL: "e",
  GMAIL_APP_PASSWORD: "e",
  SEQ_URL: "e",
  SEQ_API_KEY: "e",
  REDIS_URL: "e",
  npm_package_version: "-99",
})
