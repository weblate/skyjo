import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { authRouter } from "@/http/auth/auth.router.js"
import { googleRouter } from "@/http/auth/google.router.js"
import { feedbackRouter } from "@/http/feedback/feedback.router.js"
import { gameRouter } from "@/http/game/game.router.js"
import { penaltyRouter } from "@/http/penalty/penalty.router.js"
import { userRouter } from "@/http/user/user.router.js"

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
  .route("/penalties", penaltyRouter)
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      handleHttpException(error)

      return c.json({ error: error.message }, error.status)
    }

    Logger.error("Unexpected error in request", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return c.json({ error: "internal-server-error" }, 500)
  })

const handleHttpException = (error: HTTPException) => {
  if (error.status === 500) {
    Logger.critical(`HTTPException: ${error.message}. Cause: ${error.cause}`, {
      message: error.message,
      cause: error.cause,
      status: error.status,
      stack: error.stack,
      res: error.res,
      response: error.getResponse(),
    })
  } else {
    Logger.info(`HTTPException: ${error.message}. Cause: ${error.cause}`, {
      message: error.message,
      cause: error.cause,
      status: error.status,
      stack: error.stack,
      res: error.res,
      response: error.getResponse(),
    })
  }
}

export { httpApp }
