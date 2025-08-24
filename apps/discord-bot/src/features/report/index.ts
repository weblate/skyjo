import { InteractionRouter } from "../../interactions/router.js"
import { reportHandler } from "./handlers.js"

/**
 * Register the report feature with the interaction router
 */
export function registerReportFeature(): void {
  const router = InteractionRouter.getInstance()
  router.registerFeature("report", reportHandler)
}
