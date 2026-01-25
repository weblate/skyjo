import z from "zod"

export const waitlistSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(50).optional(),
})

export type Waitlist = z.infer<typeof waitlistSchema>
