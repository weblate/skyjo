import { z } from "zod"
import { Constants } from "../constants.js"

export const createPlayer = z.object({
  name: z
    .string()
    .min(1)
    .transform((val) => val.slice(0, 20).replace(/ /g, "_")),
  avatar: z.nativeEnum(Constants.AVATARS),
})

export type CreatePlayer = z.infer<typeof createPlayer>
