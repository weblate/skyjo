import { authRouter } from "@/http/auth/auth.router.js"
import { feedbackRouter } from "@/http/feedback/routes.js"
import { gameRouter } from "@/http/game/routes.js"
import { ENV } from "@env"
import type { Hono } from "hono"
import { cors } from "hono/cors"

export const initializeHttpServer = (app: Hono) => {
  app.use(
    "/*",
    cors({
      origin: ENV.ORIGINS.split(","),
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
  app.route("/", authRouter)
}
