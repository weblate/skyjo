import { initializeHttpServer } from "@/http/index.js"
import { initializeSocketServer } from "@/socketio/index.js"
import { serve } from "@hono/node-server"
import { Logger } from "@skyjo/logger"
import { Hono } from "hono"
import "@env"

const app = new Hono()
const port = 3001

try {
  const server = serve({
    fetch: app.fetch,
    port,
  })

  initializeSocketServer(server)
  initializeHttpServer(app)

  Logger.info(`Server started on port ${port}`)
} catch (error) {
  Logger.error("Failed to start server:", {
    error,
  })
  process.exit(1)
}
