import { Constants } from "@skymo/core"
import { z } from "zod"
import { locales } from "../../constants/locales.js"

export const passwordLowercaseRegex = /[a-z]/
export const passwordUppercaseRegex = /[A-Z]/
export const passwordNumberRegex = /\d/
export const passwordSpecialCharRegex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/

export const onboardingSchema = z.object({
  name: z
    .string()
    .min(2, "name-min-characters")
    .max(20, "name-max-characters")
    .trim(),
  username: z
    .string()
    .min(3, "username-min-characters")
    .max(20, "username-max-characters")
    .regex(/^\w+$/, "username-invalid-format"),
  avatar: z.nativeEnum(Constants.AVATARS),
  password: z.string().optional(),
})
export type Onboarding = z.infer<typeof onboardingSchema>

export const passwordSchema = z
  .string()
  .min(10, "password-min-characters")
  .regex(passwordLowercaseRegex, "password-lowercase-required")
  .regex(passwordUppercaseRegex, "password-uppercase-required")
  .regex(passwordNumberRegex, "password-number-required")
  .regex(passwordSpecialCharRegex, "password-special-char-required")
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
    .min(2, "name-min-characters")
    .max(20, "name-max-characters")
    .trim(),
})
export type UpdateName = z.infer<typeof updateNameSchema>

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "name-min-characters")
    .max(20, "name-max-characters")
    .regex(/^\w+$/, "username-invalid-format"),
})
export type UpdateUsername = z.infer<typeof updateUsernameSchema>

export const updateEmailSchema = z.object({
  email: z.string().email("email-invalid"),
})
export type UpdateEmail = z.infer<typeof updateEmailSchema>

export const updateAvatarSchema = z.object({
  avatar: z.nativeEnum(Constants.AVATARS),
})
export type UpdateAvatar = z.infer<typeof updateAvatarSchema>

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "current-password-required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "passwords-dont-match",
    path: ["confirmPassword"],
  })
export type UpdatePassword = z.infer<typeof updatePasswordSchema>

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "password-required"),
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "delete-account-confirmation-required" }),
  }),
})
export type DeleteAccount = z.infer<typeof deleteAccountSchema>

export const unlinkOAuthSchema = z.object({
  provider: z.enum(["google", "facebook"]),
})
export type UnlinkOAuth = z.infer<typeof unlinkOAuthSchema>

// User settings schemas
export const userSettingsSchema = z.object({
  locale: z.enum(locales),
  audio: z.boolean(),
  volume: z.number().min(0).max(100),
  chatVisibility: z.boolean(),
  chatNotificationSize: z.enum(["small", "normal", "big"]),
  switchToPlayerWhoIsPlaying: z.boolean(),
  showPreviewOpponentsCardsForMobile: z.boolean(),
  gameBoardSize: z.enum(["normal", "big"]),
  enlargeActivePlayerBoard: z.boolean(),
  timerDisplayMode: z.enum(["never", "smart", "always"]),
  theme: z.enum(["light", "dark", "system"]),
})
export type UserSettings = z.infer<typeof userSettingsSchema>

export const updateUserSettingsSchema = z.object({
  settings: userSettingsSchema.partial(),
})
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>
