import { getUserGames } from "@/http/user/user.service.js"
import { zValidator } from "@hono/zod-validator"
import { gameHistoryQuerySchema } from "@skymo/shared/validations"
import { Hono } from "hono"

export const userRouter = new Hono().basePath("/users")

userRouter.get(
  "/:username/games",
  zValidator("query", gameHistoryQuerySchema),
  async (c) => {
    const username = c.req.param("username")
    if (!username) {
      return c.json({ error: "Username is required" }, 400)
    }

    const query = c.req.valid("query")

    try {
      const games = await getUserGames(username, query)

      return c.json({
        success: true,
        games,
      })
    } catch (_error) {
      return c.json({ error: "Internal server error" }, 500)
    }
  },
)
