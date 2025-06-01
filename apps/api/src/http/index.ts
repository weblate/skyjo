import { authRouter } from "@/http/auth/auth.router.js"
import { feedbackRouter } from "@/http/feedback/feedback.router.js"
import { gameRouter } from "@/http/game/game.router.js"
import { userRouter } from "@/http/user/user.router.js"
import { userVerificationRouter } from "@/http/userVerification/userVerification.router.js"
import { ENV } from "@env"
import type { Hono } from "hono"
import { cors } from "hono/cors"

export const initializeHttpServer = (app: Hono) => {
  app.use(
    "/*",
    cors({
      origin: ENV.ORIGINS.split(","),
      credentials: true,
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
  app.route("/", userRouter)
  app.route("/", userVerificationRouter)
}
