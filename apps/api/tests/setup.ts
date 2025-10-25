import { vi } from "vitest"
import "@skymo/error/test/expect-extend"

// Mock the database connection
vi.mock("@/db/index.ts", () => {
  const mockDatabase = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1 }])),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([])),
    })),
  }

  return {
    db: mockDatabase,
  }
})

// Mock BullMQ to prevent actual Redis connections
vi.mock("bullmq", () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue({
        id: "test-job-id",
        timestamp: Date.now(),
        data: {},
        opts: {},
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getJob: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
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

// Mock Redis client to prevent actual Redis connections
vi.mock("@/redis/client.ts", () => {
  const mockClient = {
    isOpen: true,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    json: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    },
    exists: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    expire: vi.fn().mockResolvedValue(undefined),
    time: vi.fn().mockResolvedValue([Date.now()]),
    hSet: vi.fn().mockResolvedValue(undefined),
    hGet: vi.fn().mockResolvedValue(null),
  }

  return {
    RedisClient: class {
      static readonly instance = null
      static readonly connectionPromise = null
      static readonly connectionAttempts = 0
      static readonly MAX_CONNECTION_ATTEMPTS = 5
      static readonly isConnecting = false

      static async getClient() {
        return mockClient
      }

      static async disconnect() {
        return Promise.resolve()
      }

      static async createConnection() {
        return mockClient
      }

      static async cleanupClient() {
        return Promise.resolve()
      }
    },
  }
})

vi.mock("@/redis/message.repository.js", () => {
  return {
    MessageRepository: vi.fn().mockImplementation(() => ({
      storeMessage: vi.fn().mockResolvedValue(undefined),
      getMessageById: vi.fn().mockResolvedValue(null),
      getGameMessagesKey: vi.fn().mockReturnValue("game:test:messages"),
    })),
  }
})

vi.spyOn(process, "env", "get").mockReturnValue({
  NODE_ENV: "test",
  APP_NAME: "skymo-api",
  PORT: "3001",
  ORIGINS: "e",
  GMAIL_EMAIL: "e",
  GMAIL_APP_PASSWORD: "e",
  SEQ_URL: "e",
  SEQ_API_KEY: "e",
  REDIS_URL: "redis://mock-redis-url",
  npm_package_version: "-99",
  POSTGRES_URL: "postgresql://mock-postgres-url",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  GOOGLE_REDIRECT_URI: "test-google-redirect-uri",
  WEBSITE_URL: "http://test:3000",
  TEMP_MAIL_API_KEY: "test-temp-mail-api-key",
})
