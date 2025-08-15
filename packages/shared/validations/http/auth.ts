import { Constants } from "@skymo/core"
import { z } from "zod"
import { locales } from "../../constants/locales.js"
import { passwordSchema, userSettingsSchema } from "./user.js"

export const loginSchema = z.object({
  // login either email or username
  login: z.string().trim().min(3),
  password: z.string().trim().min(8),
})
export type LoginUser = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email("email-invalid"),
})
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "token-required"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwords-dont-match",
    path: ["confirmPassword"],
  })
export type ResetPassword = z.infer<typeof resetPasswordSchema>

export const sendVerificationEmailSchema = z.object({
  email: z.string().email("email-invalid"),
  locale: z.enum(locales).default("en"),
})
export type SendVerificationEmail = z.infer<typeof sendVerificationEmailSchema>

export const tryVerificationEmailSchema = z.object({
  pin: z.string().length(6, "pin-invalid-length"),
  email: z.string().email("email-invalid"),
  locale: z.enum(locales).default("en"),
  name: z
    .string()
    .min(1)
    .transform((val) => val.slice(0, 20).replace(/ /g, "_"))
    .optional(),
  avatar: z.nativeEnum(Constants.AVATARS).optional(),
  settings: userSettingsSchema.optional(),
})
export type TryVerificationEmail = z.infer<typeof tryVerificationEmailSchema>
