import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { authRouter } from "@/http/auth/auth.router.js"
import { googleRouter } from "@/http/auth/google.router.js"
import { feedbackRouter } from "@/http/feedback/feedback.router.js"
import { gameRouter } from "@/http/game/game.router.js"
import { userRouter } from "@/http/user/user.router.js"
import { userVerificationRouter } from "@/http/userVerification/userVerification.router.js"

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
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      Logger.error("HTTPException", {
        ...error.getResponse(),
      })
      return c.json({ error: error.message }, error.status)
    }

    Logger.error("Unexpected error in request", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return c.json({ error: "internal-server-error" }, 500)
  })
export { httpApp }
