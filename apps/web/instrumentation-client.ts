import posthog from "posthog-js"

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ulysse",
  ui_host: "https://eu.posthog.com",
  defaults: "2025-05-24",
  capture_exceptions: true,
  // autocapture: {
  //   dom_event_allowlist: [], // Disable click tracking (milestone-focused approach)
  // },
  autocapture: true,

  capture_pageview: true, // Enable pageviews (essential for funnels)
  capture_pageleave: true, // Track session duration
  debug: process.env.NODE_ENV === "development",
})
