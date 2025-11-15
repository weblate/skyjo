import { z } from "zod"

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_NAME: z.string({
    error: "APP_NAME must be set in .env file",
  }),

  REDIS_URL: z.string({
    error: "REDIS_URL must be set in .env file",
  }),
  POSTGRES_URL: z.string({
    error: "POSTGRES_URL must be set in .env file",
  }),

  DISCORD_BOT_TOKEN: z.string({
    error: "DISCORD_BOT_TOKEN must be set in .env file",
  }),
  DISCORD_REPORT_CHANNEL_ID: z.string({
    error: "DISCORD_REPORT_CHANNEL_ID must be set in .env file",
  }),
  API_BASE_URL: z.string({
    error: "API_BASE_URL must be set in .env file",
  }),
  API_SESSION_ID: z.string({
    error: "API_SESSION_ID must be set in .env file",
  }),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(parsedEnv.error.message)
  process.exit(1)
}

export const ENV = parsedEnv.data
export type Env = z.infer<typeof envSchema>
