import { createDatabaseClient } from "@skymo/database/client"
import { ENV } from "../env.js"

export const db = createDatabaseClient(ENV.POSTGRES_URL)
