import { z } from "zod"
import { locales } from "../constants/locales.js"

export const passwordLowercaseRegex = /[a-z]/
export const passwordUppercaseRegex = /[A-Z]/
export const passwordNumberRegex = /\d/
export const passwordSpecialCharRegex = /[!@#$%^&*(),.?":{}|<>]/

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  locale: z.enum(locales).default("en"),
})
export type Signup = z.infer<typeof signupSchema>

export const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 characters"),
})
export type Verify = z.infer<typeof verifySchema>

export const onboardingSchema = z.object({
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
export type Onboarding = z.infer<typeof onboardingSchema>

export const loginSchema = z.object({
  // login either email or userTag
  login: z.string().min(3),
  password: z.string().min(10),
})
export type LoginUser = z.infer<typeof loginSchema>
