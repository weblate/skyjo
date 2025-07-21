import { z } from "zod"

export const transferHostSchema = z.object({
  newHostId: z.string().uuid(),
})

export type TransferHost = z.input<typeof transferHostSchema>
