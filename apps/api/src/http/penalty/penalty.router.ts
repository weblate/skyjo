import { zValidator } from "@hono/zod-validator"
import { applyPenaltySchema, penaltyIdParamSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { authMiddleware } from "@/http/middlewares/auth.middleware.js"
import {
  type GuestAuthContextVariables,
  guestAuthMiddleware,
} from "@/http/middlewares/guestAuth.middleware.js"
import {
  applyPenalty,
  canChat,
  canPlay,
  completeLeavebuster,
  getActivePenalties,
  getPenaltyById,
  hasActiveLeavebuster,
  LEAVEBUSTER_CONFIG,
} from "@/http/penalty/penalty.service.js"

const app = new Hono<GuestAuthContextVariables>()

app.get("/active", guestAuthMiddleware(), async (c) => {
  const userId = c.get("user")?.id
  const guestId = c.get("guestId")

  const penalties = await getActivePenalties(userId, guestId)

  const penaltiesWithConfig = penalties.map((penalty) => {
    if (penalty.type === "leavebuster" && penalty.level) {
      const config =
        LEAVEBUSTER_CONFIG[penalty.level as keyof typeof LEAVEBUSTER_CONFIG]
      return {
        ...penalty,
        displayDuration: config?.duration,
      }
    }
    return penalty
  })

  return c.json({ penalties: penaltiesWithConfig })
})

app.get("/can-play", guestAuthMiddleware(), async (c) => {
  const userId = c.get("user")?.id
  const guestId = c.get("guestId")

  const canPlayGames = await canPlay(userId, guestId)

  if (!canPlayGames) {
    const leavebuster = await hasActiveLeavebuster(userId, guestId)
    if (leavebuster) {
      const config =
        LEAVEBUSTER_CONFIG[leavebuster.level as keyof typeof LEAVEBUSTER_CONFIG]
      return c.json({
        canPlay: false,
        blockingPenalty: {
          type: "leavebuster",
          level: leavebuster.level,
          completionsRemaining:
            (leavebuster.completionsRequired || 0) -
            (leavebuster.completionsDone || 0),
          displayDuration: config?.duration,
        },
      })
    }
  }

  return c.json({ canPlay: canPlayGames })
})

app.get("/can-chat", guestAuthMiddleware(), async (c) => {
  const userId = c.get("user")?.id
  const guestId = c.get("guestId")

  const canUseChat = await canChat(userId, guestId)

  return c.json({ canChat: canUseChat })
})

app.post(
  "/apply",
  authMiddleware("ADMIN"),
  zValidator("json", applyPenaltySchema),
  async (c) => {
    const penaltyData = c.req.valid("json")

    try {
      const penalty = await applyPenalty(penaltyData)
      return c.json({ penalty })
    } catch {
      return c.json({ error: "failed-to-apply-penalty" }, 500)
    }
  },
)

app.post(
  "/:penaltyId/complete-leavebuster",
  authMiddleware("ADMIN"),
  zValidator("param", penaltyIdParamSchema),
  async (c) => {
    const { penaltyId } = c.req.valid("param")

    const penalty = await getPenaltyById(penaltyId)

    if (!penalty || penalty.type !== "leavebuster") {
      return c.json({ error: "penalty-not-found" }, 404)
    }

    if ((penalty.completionsDone || 0) >= (penalty.completionsRequired || 0)) {
      return c.json({ error: "penalty-already-completed" }, 400)
    }

    const updated = await completeLeavebuster(penaltyId)

    const completionsRemaining =
      (updated.completionsRequired || 0) - (updated.completionsDone || 0)
    const isFinished = completionsRemaining <= 0

    return c.json({
      completed: updated.completionsDone,
      remaining: completionsRemaining,
      isFinished,
    })
  },
)

export { app as penaltyRouter }
