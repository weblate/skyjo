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
    .min(3, "Name must be at least 3 characters")
    .max(20, "Name must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Name can only contain letters, numbers, and underscores",
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
export type usernameAvailability = z.infer<typeof usernameAvailabilitySchema>
// User settings update schemas
export const updateNameSchema = z.object({
  name: z
    .string()
    .min(1, "Display name is required")
    .max(20, "Display name must be at most 20 characters")
    .trim(),
})
export type UpdateName = z.infer<typeof updateNameSchema>

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(20, "Name must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
})
export type UpdateUsername = z.infer<typeof updateUsernameSchema>

export const updateEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
})
export type UpdateEmail = z.infer<typeof updateEmailSchema>

export const updateAvatarSchema = z.object({
  avatar: z.nativeEnum(Constants.AVATARS),
})
export type UpdateAvatar = z.infer<typeof updateAvatarSchema>

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
export type UpdatePassword = z.infer<typeof updatePasswordSchema>

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account"),
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "Please type DELETE to confirm" }),
  }),
})
export type DeleteAccount = z.infer<typeof deleteAccountSchema>

export const unlinkOAuthSchema = z.object({
  provider: z.enum(["google", "facebook"]),
})
export type UnlinkOAuth = z.infer<typeof unlinkOAuthSchema>
