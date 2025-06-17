import type { httpApp } from "@/http/index.js"
import { hc } from "hono/client"

// assign the client to a variable to calculate the type when compiling
// Note: We only import the type, not the runtime implementation
export type Client = ReturnType<typeof hc<typeof httpApp>>
export const hcWithType = (
  ...args: Parameters<typeof hc<typeof httpApp>>
): Client => hc<typeof httpApp>(...args)
