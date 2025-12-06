import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import Cookies from "js-cookie"
import posthog from "posthog-js"

// Check if user has opted out of analytics
const hasOptedOut = (): boolean => {
  try {
    return localStorage.getItem("analytics_opt_out") === "true"
  } catch {
    return false
  }
}

// Get guestId for initial identification (before auth)
// Only use if guest hasn't opted out
const guestId = hasOptedOut() ? undefined : Cookies.get(GUEST_ID_COOKIE_NAME)

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ulysse",
  ui_host: "https://eu.posthog.com",
  defaults: "2025-11-30",
  capture_exceptions: true,

  // Disable autocapture - we only want pageviews
  autocapture: {
    dom_event_allowlist: [], // No click/interaction tracking
  },

  // Enable automatic pageview - URL normalization handled in PostHog UI
  capture_pageview: true,
  capture_pageleave: true, // Keep pageleave for session duration tracking

  debug: process.env.NODE_ENV === "development",

  // Use guestId as initial distinct_id before authentication
  // This allows tracking guest → authenticated user journey
  // Only set if guest hasn't opted out
  ...(guestId && { distinct_id: `guest_${guestId}` }),
})
