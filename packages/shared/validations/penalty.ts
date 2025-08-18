import { z } from "zod"
import { penaltyTypes } from "../types/penalty.js"

// Schema for penalty ID parameter validation
export const penaltyIdParamSchema = z.object({
  penaltyId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1)),
})
export type PenaltyIdParam = z.infer<typeof penaltyIdParamSchema>

// Schema for applying a penalty (admin/bot)
export const applyPenaltySchema = z.object({
  targetUserId: z.number().optional(),
  targetGuestId: z.string().optional(),
  type: z.enum(penaltyTypes),
  level: z.number().min(1).max(5).optional(), // For leavebuster
  durationMinutes: z.number().optional(), // For time-based penalties
  reason: z.string(),
  reportId: z.number().optional(),
})
export type ApplyPenalty = z.infer<typeof applyPenaltySchema>