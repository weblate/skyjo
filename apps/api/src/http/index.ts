import { authRouter } from "@/http/auth/auth.router.js"
import { googleRouter } from "@/http/auth/google.router.js"
import { feedbackRouter } from "@/http/feedback/feedback.router.js"
import { gameRouter } from "@/http/game/game.router.js"
import { userRouter } from "@/http/user/user.router.js"
import { userVerificationRouter } from "@/http/userVerification/userVerification.router.js"
import { ENV } from "@env"
import { Hono } from "hono"
import { cors } from "hono/cors"

const httpApp = new Hono()
  .use(
    "/*",
    cors({
      origin: ENV.ORIGINS.split(","),
      credentials: true,
    }),
  )
  .get("/", (c) => {
    return c.json({
      message: "API is running",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
    })
  })
  .route("/auth", authRouter)
  .route("/auth/google", googleRouter)
  .route("/games", gameRouter)
  .route("/feedbacks", feedbackRouter)
  .route("/users", userRouter)
  .route("/verification", userVerificationRouter)

export { httpApp }
