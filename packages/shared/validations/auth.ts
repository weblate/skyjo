import { z } from "zod"

export const passwordLowercaseRegex = /[a-z]/
export const passwordUppercaseRegex = /[A-Z]/
export const passwordNumberRegex = /\d/
export const passwordSpecialCharRegex = /[!@#$%^&*(),.?":{}|<>]/

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3).max(20),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(passwordLowercaseRegex, "Must contain at least one lowercase letter")
    .regex(passwordUppercaseRegex, "Must contain at least one uppercase letter")
    .regex(passwordNumberRegex, "Must contain at least one number")
    .regex(
      passwordSpecialCharRegex,
      "Must contain at least one special character",
    ),
})
export type RegisterUser = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  // login either email or userTag
  login: z.string().min(3),
  password: z.string().min(10),
})
export type LoginUser = z.infer<typeof loginSchema>
