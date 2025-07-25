import { PostHog } from "posthog-node"

export const posthogClient: PostHog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY as string,
  {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  },
)
const featureFlagCache = new Map<string, { value: boolean; expires: number }>()

export async function getCachedFeatureFlag(flag: string) {
  const cached = featureFlagCache.get(flag)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  const value = await posthogClient.isFeatureEnabled(flag, "web-server")
  if (value) {
    featureFlagCache.set(flag, { value, expires: Date.now() + 300000 }) // 5 min cache
  }
  return value ?? false
}
