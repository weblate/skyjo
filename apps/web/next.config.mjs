import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      // PostHog rewrites - handle both direct paths (default locale) and paths with locale prefixes
      {
        source: "/relay-913U/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/:locale/relay-913U/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/relay-913U/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/:locale/relay-913U/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/relay-913U/flags",
        destination: "https://eu.i.posthog.com/flags",
      },
      {
        source: "/:locale/relay-913U/flags",
        destination: "https://eu.i.posthog.com/flags",
      },
    ]
  },
  skipTrailingSlashRedirect: true,
  reactStrictMode: false,
  turbopack: {},
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    minimumCacheTTL: 2678400,
  },
}

export default withNextIntl(nextConfig)
