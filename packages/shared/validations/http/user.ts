import { Constants } from "@skymo/core"
import { z } from "zod"

export const passwordLowercaseRegex = /[a-z]/
export const passwordUppercaseRegex = /[A-Z]/
export const passwordNumberRegex = /\d/
export const passwordSpecialCharRegex = /[!"#$%&'()*+,-./:;<=>?@\[\]^_`{|}~]/
export const onboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Display name is required")
    .max(20, "Display name must be at most 20 characters")
    .trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  avatar: z.nativeEnum(Constants.AVATARS),
  password: z.string().optional(),
})
export type Onboarding = z.infer<typeof onboardingSchema>

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(passwordLowercaseRegex, "Must contain at least one lowercase letter")
  .regex(passwordUppercaseRegex, "Must contain at least one uppercase letter")
  .regex(passwordNumberRegex, "Must contain at least one number")
  .regex(
    passwordSpecialCharRegex,
    "Must contain at least one special character",
  )
export type Password = z.infer<typeof passwordSchema>

export const onboardingWithPasswordSchema = z.object({
  ...onboardingSchema.shape,
  password: passwordSchema,
})

export const usernameAvailabilitySchema = z.object({
  username: z.string().min(1).max(20),
})
export type UsernameAvailability = z.infer<typeof usernameAvailabilitySchema>
