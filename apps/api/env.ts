import { z } from "zod"

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_NAME: z.string({ message: "APP_NAME must be set in .env file" }),
  PORT: z.coerce.number({ message: "PORT must be set in .env file" }),
  ORIGINS: z.string({ message: "ORIGINS must be set in .env file" }),

  REDIS_URL: z.string({ message: "REDIS_URL must be set in .env file" }),

  POSTGRES_URL: z.string({ message: "POSTGRES_URL must be set in .env file" }),

  GMAIL_EMAIL: z.string({ message: "GMAIL_EMAIL must be set in .env file" }),
  GMAIL_APP_PASSWORD: z.string({
    message: "GMAIL_APP_PASSWORD must be set in .env file",
  }),

  GOOGLE_CLIENT_ID: z.string({
    message: "GOOGLE_CLIENT_ID must be set in .env file",
  }),
  GOOGLE_CLIENT_SECRET: z.string({
    message: "GOOGLE_CLIENT_SECRET must be set in .env file",
  }),
  GOOGLE_REDIRECT_URI: z.string({
    message: "GOOGLE_REDIRECT_URI must be set in .env file",
  }),

  WEBSITE_URL: z.string({
    message: "WEBSITE_URL must be set in .env file",
  }),

  TEMP_MAIL_API_KEY: z.string({
    message: "TEMP_MAIL_API_KEY must be set in .env file",
  }),

  GUEST_COOKIE_DOMAIN: z.string().optional(),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error(parsedEnv.error.message)
  process.exit(1)
}

export const ENV = parsedEnv.data
export type Env = z.infer<typeof envSchema>
