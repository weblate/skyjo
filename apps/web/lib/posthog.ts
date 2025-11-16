import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import Cookies from "js-cookie"
import posthog from "posthog-js"
import { AuthenticatedUser } from "@/hooks/useAuth"

const hasOptedOutOfAnalytics = (): boolean => {
  try {
    const optOut = localStorage.getItem("analytics_opt_out")
    return optOut === "true"
  } catch {
    return false
  }
}

/**
 * Identifies a guest user in PostHog using the guest ID cookie.
 * Call this when guest performs their first game interaction (legitimate interest).
 * Respects user's opt-out preference.
 */
export const identifyGuest = () => {
  if (hasOptedOutOfAnalytics()) return

  const guestId = Cookies.get(GUEST_ID_COOKIE_NAME)

  if (!guestId) {
    return
  }

  posthog.identify(`guest_${guestId}`, {
    guest_id: guestId,
    is_authenticated: false,
    user_type: "guest",
  })
}

/**
 * Identifies an authenticated user in PostHog with full user properties.
 * Call this after successful login or when user data loads.
 * Respects user's opt-out preference.
 *
 * @param user - The authenticated user object from the database
 */
export const identifyUser = (user: AuthenticatedUser) => {
  // Check both user preference and localStorage (for backwards compatibility)
  if (hasOptedOutOfAnalytics() || user.analyticsConsent === false) return

  if (!user?.id) {
    return
  }

  // Determine authentication provider
  const authProvider = user.hasOAuth ? "oauth" : "email"

  posthog.identify(`user_${user.id}`, {
    user_id: user.id,
    avatar: user.avatar,
    role: user.role,
    is_authenticated: true,
    user_type: "authenticated",
    auth_provider: authProvider,
    has_password: !user.hasOAuth,
    onboarding_completed: user.onboardingCompleted,
  })
}

/**
 * Links a guest user to their authenticated user account.
 * Call this immediately after successful signup/login to merge sessions.
 * Respects user's opt-out preference.
 *
 * @param userId - The authenticated user's ID
 */
export const aliasUser = (user: AuthenticatedUser) => {
  if (hasOptedOutOfAnalytics() || user.analyticsConsent === false) return

  if (!user?.id) {
    return
  }

  const guestId = Cookies.get(GUEST_ID_COOKIE_NAME)

  if (!guestId) {
    return
  }

  // Alias guest_xxx to user_xxx
  posthog.alias(`user_${user.id}`, `guest_${guestId}`)
}

/**
 * Resets PostHog identification (e.g., on logout)
 */
export const resetIdentification = () => {
  posthog.reset()
}

/**
 * Opt user out of analytics tracking
 */
export const optOutOfAnalytics = () => {
  try {
    localStorage.setItem("analytics_opt_out", "true")
    posthog.opt_out_capturing()
    posthog.reset() // Clear any existing identification
  } catch (error) {
    console.error("Failed to opt out of analytics:", error)
  }
}

/**
 * Opt user back into analytics tracking
 */
export const optInToAnalytics = () => {
  try {
    localStorage.removeItem("analytics_opt_out")
    posthog.opt_in_capturing()
  } catch (error) {
    console.error("Failed to opt in to analytics:", error)
  }
}

/**
 * Check if user has opted out
 */
export const isOptedOut = (): boolean => {
  return hasOptedOutOfAnalytics()
}
