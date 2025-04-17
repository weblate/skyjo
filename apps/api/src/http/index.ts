import { feedbackRouter } from "@/http/routers/feedback.router.js"
import { gameRouter } from "@/http/routers/game.router.js"
import { ENV } from "@env"
import type { Hono } from "hono"
import { cors } from "hono/cors"

export const initializeHttpServer = (app: Hono) => {
  app.use(
    "/*",
    cors({
      origin: ENV.ORIGINS,
    }),
  )

  app.get("/", (c) => {
    return c.json({
      message: "API is running",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    })
  })

  // routes prefixe are defined in each router
  app.route("/", gameRouter)
  app.route("/", feedbackRouter)
}
