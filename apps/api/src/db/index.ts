import { ENV } from "@env"
import { createDatabaseClient } from "@skymo/database/client"

export const db = createDatabaseClient(ENV.POSTGRES_URL)
