import { z } from "zod"

export const verifyPinSchema = z.object({
  pin: z.string().length(6, "min-characters"),
})
export type VerifyPin = z.infer<typeof verifyPinSchema>
