import posthog from "posthog-js"

/**
 * Identifies an authenticated user in PostHog.
 * Only identifies users who are logged in (not guests).
 *
 * @param userId - The logged-in user's ID (required)
 */
export const identifyUser = (userId: number) => {
  if (!userId) {
    return
  }

  // Identify with the user ID as the distinct_id
  posthog.identify(`user_${userId}`, {
    user_id: userId,
    is_authenticated: true,
  })
}

/**
 * Resets PostHog identification (e.g., on logout)
 */
export const resetIdentification = () => {
  posthog.reset()
}
