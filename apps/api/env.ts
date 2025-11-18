import { z } from "zod"

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_NAME: z.string({
    error: "APP_NAME must be set in .env file",
  }),
  PORT: z.coerce.number({
    error: "PORT must be set in .env file",
  }),
  ORIGINS: z.string({
    error: "ORIGINS must be set in .env file",
  }),

  REDIS_URL: z.string({
    error: "REDIS_URL must be set in .env file",
  }),

  POSTGRES_URL: z.string({
    error: "POSTGRES_URL must be set in .env file",
  }),

  GMAIL_EMAIL: z.string({
    error: "GMAIL_EMAIL must be set in .env file",
  }),
  GMAIL_APP_PASSWORD: z.string({
    error: "GMAIL_APP_PASSWORD must be set in .env file",
  }),

  GOOGLE_CLIENT_ID: z.string({
    error: "GOOGLE_CLIENT_ID must be set in .env file",
  }),
  GOOGLE_CLIENT_SECRET: z.string({
    error: "GOOGLE_CLIENT_SECRET must be set in .env file",
  }),
  GOOGLE_REDIRECT_URI: z.string({
    error: "GOOGLE_REDIRECT_URI must be set in .env file",
  }),

  WEBSITE_URL: z.string({
    error: "WEBSITE_URL must be set in .env file",
  }),

  TEMP_MAIL_API_KEY: z.string({
    error: "TEMP_MAIL_API_KEY must be set in .env file",
  }),

  GUEST_COOKIE_DOMAIN: z.string().optional(),
  SESSION_COOKIE_DOMAIN: z.string().optional(),

  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(parsedEnv.error.message)
  process.exit(1)
}

export const ENV = parsedEnv.data
export type Env = z.infer<typeof envSchema>
