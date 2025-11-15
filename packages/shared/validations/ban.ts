import { z } from "zod"

export const banPlayerSchema = z.object({
  targetId: z.uuid(),
})
export type BanPlayer = z.infer<typeof banPlayerSchema>
