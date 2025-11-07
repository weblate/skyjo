// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://30fe1eaf21296c6792f45698b4f00987@o4508749759315968.ingest.de.sentry.io/4509923317579856",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  tunnel: "/ulysse",

  // Ignore known browser extension errors
  ignoreErrors: [
    // Firefox extensions
    "window.__firefox__",
    "__firefox__",
    // Dark Reader extension
    "DarkReader",
    // Ethereum wallet extensions
    "window.ethereum",
    "_metamask",
    // Other common extension errors
    "chrome-extension://",
    "moz-extension://",
    "safari-extension://",
  ],

  // Filter errors before sending
  beforeSend(event, hint) {
    // Filter errors from browser extensions
    const error = hint.originalException

    if (error && typeof error === "object") {
      const message = "message" in error ? String(error.message) : ""

      // Block extension-related errors
      if (
        message.includes("__firefox__") ||
        message.includes("DarkReader") ||
        message.includes("ethereum") ||
        message.includes("chrome-extension") ||
        message.includes("moz-extension")
      ) {
        return null
      }
    }

    // Check if error comes from extension scripts
    const frames = event.exception?.values?.[0]?.stacktrace?.frames
    if (frames) {
      const hasExtensionFrame = frames.some((frame) => {
        const filename = frame.filename || ""
        return (
          filename.includes("chrome-extension://") ||
          filename.includes("moz-extension://") ||
          filename.includes("safari-extension://")
        )
      })

      if (hasExtensionFrame) {
        return null
      }
    }

    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
