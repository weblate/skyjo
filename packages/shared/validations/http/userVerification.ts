import { z } from "zod"

export const verifyPinSchema = z.object({
  pin: z.string().length(6, "PIN must be 6 characters"),
})
export type VerifyPin = z.infer<typeof verifyPinSchema>
