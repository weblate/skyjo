import react from "@vitejs/plugin-react"
import path from "path"
import tsconfigPaths from "vite-tsconfig-paths"
import { coverageConfigDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "next/navigation": path.resolve(
        __dirname,
        "./tests/mocks/next-navigation.ts",
      ),
      "next/dist/lib/metadata/types/alternative-urls-types": path.resolve(
        __dirname,
        "./tests/mocks/next-metadata.ts",
      ),
      "next-intl/navigation": path.resolve(
        __dirname,
        "./tests/mocks/next-intl-navigation.ts",
      ),
      "next-intl/routing": path.resolve(
        __dirname,
        "./tests/mocks/next-intl-routing.ts",
      ),
      "@/i18n/routing": path.resolve(
        __dirname,
        "./tests/mocks/i18n-routing.ts",
      ),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    coverage: {
      reporter: ["text", "html", "json-summary", "json"],
      reportOnFailure: true,
      provider: "istanbul",
      reportsDirectory: "tests/coverage",
      exclude: [
        "**/*.config.{js,ts}",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/.next/**",
        ...coverageConfigDefaults.exclude,
      ],
      include: ["./lib/game.ts"],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
})
