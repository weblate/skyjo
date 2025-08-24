import { Logger } from "@skymo/logger"
import { registerReportFeature } from "./report/index.js"

/**
 * Register all features with the interaction router
 */
export function registerAllFeatures(): void {
  const features = [
    { name: "report", register: registerReportFeature },
    // Add new features here
  ]

  for (const feature of features) {
    try {
      feature.register()
      Logger.info(`✓ Registered feature: ${feature.name}`)
    } catch (error) {
      Logger.error(`✗ Failed to register feature: ${feature.name}`, { error })
    }
  }

  Logger.info(`Registered ${features.length} features`)
}
