import { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
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
  reactStrictMode: process.env.NODE_ENV === "production",
  turbopack: {},
  output: "standalone",
  transpilePackages: [
    "@skymo/core",
    "@skymo/error",
    "@skymo/shared",
    "@skymo/state-operations",
  ],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    minimumCacheTTL: 2678400,
  },

  serverExternalPackages: [
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/instrumentation",
  ],

  async rewrites() {
    return [
      {
        source: "/ulysse/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ulysse/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ]
  },

  skipTrailingSlashRedirect: true,
}

export default withNextIntl(nextConfig)
