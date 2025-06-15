import { httpApp } from "@/http/index.js"
import { hc } from "hono/client"

// assign the client to a variable to calculate the type when compiling
const client = hc<typeof httpApp>("")
export type Client = typeof client
export const hcWithType = (
  ...args: Parameters<typeof hc<typeof httpApp>>
): Client => hc<typeof httpApp>(...args)
