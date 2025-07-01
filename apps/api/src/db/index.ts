import { ENV } from "@env"
import { createDatabaseClient } from "@skymo/database/client"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"

export const db: NodePgDatabase = createDatabaseClient(ENV.POSTGRES_URL)
