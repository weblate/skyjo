import { z } from "zod"
import { locales } from "../../constants/locales.js"

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  locale: z.enum(locales).default("en"),
})
export type Signup = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  // login either email or userTag
  login: z.string().min(3),
  password: z.string().min(10),
})
export type LoginUser = z.infer<typeof loginSchema>
