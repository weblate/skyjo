import posthog from "posthog-js"

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ulysse",
  ui_host: "https://eu.posthog.com",
  defaults: "2025-11-30",
  capture_exceptions: true,
  autocapture: {
    dom_event_allowlist: [],
  },

  capture_pageview: true,
  capture_pageleave: true,
  debug: process.env.NODE_ENV === "development",
})
