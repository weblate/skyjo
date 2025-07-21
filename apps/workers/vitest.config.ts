// vitest.config.ts
import tsconfigPaths from "vite-tsconfig-paths"
import { coverageConfigDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: "./tests/setup.ts",
    coverage: {
      reporter: ["text", "html", "json-summary", "json"],
      reportOnFailure: true,
      provider: "istanbul",
      reportsDirectory: "tests/coverage",
      include: ["src/game-storage/*.ts"],
      exclude: ["./src/**/*.ts", ...coverageConfigDefaults.exclude],
    },
  },
})
