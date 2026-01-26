import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsup"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: [
    /^@skymo\//,
    "discord.js",
    "bullmq",
    "redis",
    "drizzle-orm",
    "zod",
    "dayjs",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(__dirname, "src"),
      "@env": path.resolve(__dirname, "env.ts"),
    }
  },
})
