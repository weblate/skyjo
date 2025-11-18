import posthog from "posthog-js"

/**
 * Check if analytics is enabled
 */
const isAnalyticsEnabled = (): boolean => {
  try {
    const optOut = localStorage.getItem("analytics_opt_out")
    return optOut !== "true"
  } catch {
    return true // Default to enabled
  }
}

/**
 * Capture an event with PostHog
 * Respects user opt-out preference
 */
export const captureEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  if (!isAnalyticsEnabled()) return

  try {
    posthog.capture(eventName, properties)
  } catch (error) {
    console.error("Failed to capture event:", error)
  }
}
