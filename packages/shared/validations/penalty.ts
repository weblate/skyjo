import { z } from "zod"
import { penaltyTypes } from "../types/penalty.js"

export const penaltyIdParamSchema = z.object({
  penaltyId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
})
export type PenaltyIdParam = z.infer<typeof penaltyIdParamSchema>

export const createPenaltySchema = z.object({
  targetUserId: z.number().optional(),
  targetGuestId: z.string().optional(),
  type: z.enum(penaltyTypes),
  level: z.number().min(1).max(5).optional(),
  durationMinutes: z.number().optional(),
  reason: z.string(),
  reportId: z.number().optional(),
})
export type CreatePenalty = z.infer<typeof createPenaltySchema>
