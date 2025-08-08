import { drizzle } from "drizzle-orm/neon-http"

export function createDatabaseClient(connectionString: string) {
  return drizzle(connectionString)
}
