import { z } from "zod"

export const transferHostSchema = z.object({
  newHostId: z.uuid(),
})

export type TransferHost = z.input<typeof transferHostSchema>
