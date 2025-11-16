import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { PostHog } from "posthog-node"

class PostHogService {
  private client: PostHog | null = null
  private isEnabled: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    const apiKey = ENV.POSTHOG_API_KEY
    const host = ENV.POSTHOG_HOST || "https://eu.posthog.com"

    if (!apiKey) {
      Logger.warn("PostHog API key not configured - analytics disabled")
      return
    }

    try {
      this.client = new PostHog(apiKey, {
        host,
        flushAt: 20, // Flush after 20 events
        flushInterval: 10000, // Flush every 10 seconds
      })
      this.isEnabled = true
      Logger.info("PostHog initialized successfully")
    } catch (error) {
      Logger.error("Failed to initialize PostHog", { error })
    }
  }

  /**
   * Capture an event
   */
  capture({
    distinctId,
    event,
    properties = {},
  }: {
    distinctId: string
    event: string
    properties?: Record<string, unknown>
  }) {
    if (!this.isEnabled || !this.client) {
      return
    }

    try {
      this.client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          $lib: "posthog-node",
          environment: ENV.NODE_ENV,
        },
      })
    } catch (error) {
      Logger.error("PostHog capture failed", { error, event, distinctId })
    }
  }

  /**
   * Capture an event with opt-out consent check
   * Should be used for authenticated users and guests who can opt out
   */
  captureWithConsent({
    distinctId,
    event,
    properties = {},
    analyticsConsent,
  }: {
    distinctId: string
    event: string
    properties?: Record<string, unknown>
    analyticsConsent?: boolean
  }) {
    // If user has explicitly opted out, don't track
    if (analyticsConsent === false) {
      return
    }

    // Otherwise, track normally
    this.capture({ distinctId, event, properties })
  }

  /**
   * Identify a user with properties
   */
  identify({
    distinctId,
    properties = {},
  }: {
    distinctId: string
    properties?: Record<string, unknown>
  }) {
    if (!this.isEnabled || !this.client) {
      return
    }

    try {
      this.client.identify({
        distinctId,
        properties: {
          ...properties,
          environment: ENV.NODE_ENV,
        },
      })
    } catch (error) {
      Logger.error("PostHog identify failed", { error, distinctId })
    }
  }

  /**
   * Alias a user (link anonymous ID to authenticated ID)
   */
  alias({ distinctId, alias }: { distinctId: string; alias: string }) {
    if (!this.isEnabled || !this.client) {
      return
    }

    try {
      this.client.alias({
        distinctId,
        alias,
      })
    } catch (error) {
      Logger.error("PostHog alias failed", { error, distinctId, alias })
    }
  }

  /**
   * Flush all pending events
   */
  async flush() {
    if (!this.isEnabled || !this.client) {
      return
    }

    try {
      await this.client.flush()
    } catch (error) {
      Logger.error("PostHog flush failed", { error })
    }
  }

  /**
   * Shutdown PostHog client
   */
  async shutdown() {
    if (!this.isEnabled || !this.client) {
      return
    }

    try {
      await this.client.shutdown()
      Logger.info("PostHog shutdown successfully")
    } catch (error) {
      Logger.error("PostHog shutdown failed", { error })
    }
  }

  /**
   * Check if PostHog is enabled
   */
  get enabled() {
    return this.isEnabled
  }
}

export const posthog = new PostHogService()
