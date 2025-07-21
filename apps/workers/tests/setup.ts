// Test setup file for workers package
import { beforeAll, vi } from "vitest"

beforeAll(() => {
  // Setup code that runs before all tests
})

vi.spyOn(process, "env", "get").mockReturnValue({
  NODE_ENV: "test",
  APP_NAME: "skymo-workers",
  SEQ_URL: "http://test:3000",
  SEQ_API_KEY: "test-seq-api-key",

  REDIS_URL: "redis://mock-redis-url",
  POSTGRES_URL: "postgresql://mock-postgres-url",

  npm_package_version: "-99",

  RESEND_API_KEY: "test-resend-api-key",

  FRONT_URL: "http://test:3000",
  DISCORD_URL: "http://test:3000",
  SUPPORT_EMAIL: "test@test.com",
})
