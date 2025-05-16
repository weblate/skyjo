import { z } from "zod"

export const passwordLowercaseRegex = /[a-z]/
export const passwordUppercaseRegex = /[A-Z]/
export const passwordNumberRegex = /\d/
export const passwordSpecialCharRegex = /[!@#$%^&*(),.?":{}|<>]/

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
