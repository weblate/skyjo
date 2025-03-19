import { z } from "zod"

export const banPlayerSchema = z.object({
  targetId: z.string().uuid(),
})
export type BanPlayer = z.infer<typeof banPlayerSchema>
