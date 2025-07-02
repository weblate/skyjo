import z from "zod"

export const sendChatMessage = z.object({
  name: z.string(),
  message: z.string().max(200),
})

export type SendChatMessage = z.infer<typeof sendChatMessage>

export const wizzPlayerName = z.string()

export type WizzPlayerName = z.infer<typeof wizzPlayerName>
