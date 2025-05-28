import { z } from "zod"
import { locales } from "../../constants/locales.js"
import { passwordSchema } from "./user.js"

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

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
export type ResetPassword = z.infer<typeof resetPasswordSchema>
