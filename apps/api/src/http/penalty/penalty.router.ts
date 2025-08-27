import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import {
  createPenaltySchema,
  penaltyIdParamSchema,
} from "@skymo/shared/validations"
import { Hono } from "hono"
import { authMiddleware } from "@/http/middlewares/auth.middleware.js"
import {
  type GuestAuthContextVariables,
  guestAuthMiddleware,
} from "@/http/middlewares/guestAuth.middleware.js"
import {
  acknowledgePenalty,
  completeLeavebuster,
  createPenalty,
  getActivePenalties,
  getPenaltyById,
  LEAVEBUSTER_CONFIG,
} from "@/http/penalty/penalty.service.js"

const app = new Hono<GuestAuthContextVariables>()

app.post(
  "/",
  authMiddleware("ADMIN"),
  zValidator("json", createPenaltySchema),
  async (c) => {
    const penaltyData = c.req.valid("json")

    try {
      const penalty = await createPenalty(penaltyData)
      return c.json({ penalty })
    } catch (error) {
      Logger.error("Failed to apply penalty:", { error })
      return c.json({ error: "failed-to-apply-penalty" }, 500)
    }
  },
)

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

app.post(
  "/:penaltyId/acknowledge",
  guestAuthMiddleware(),
  zValidator("param", penaltyIdParamSchema),
  async (c) => {
    const { penaltyId } = c.req.valid("param")
    const userId = c.get("user")?.id
    const guestId = c.get("guestId")

    const penalty = await getPenaltyById(penaltyId)

    if (!penalty) {
      return c.json({ error: "penalty-not-found" }, 404)
    }

    // Verify the penalty belongs to this user
    if (penalty.userId !== userId && penalty.guestId !== guestId) {
      return c.json({ error: "unauthorized" }, 403)
    }

    // Check if already acknowledged
    if (penalty.acknowledgedAt) {
      return c.json({ error: "penalty-already-acknowledged" }, 400)
    }

    await acknowledgePenalty(penaltyId)

    return c.json({ success: true })
  },
)

export { app as penaltyRouter }
