import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "tsup"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  external: [
    /^@skymo\//,
    // Native modules - must be external
    "argon2",
    "bufferutil",
    "utf-8-validate",
    // Heavy dependencies
    "@hono/node-server",
    "@hono/zod-validator",
    "hono",
    "socket.io",
    "socket.io-msgpack-parser",
    "@socket.io/redis-adapter",
    "bullmq",
    "redis",
    "drizzle-orm",
    "resend",
    "nodemailer",
    "arctic",
    "posthog-node",
    "rate-limiter-flexible",
    "zod",
    "dayjs",
    "@oslojs/crypto",
    "@oslojs/encoding",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(__dirname, "src"),
      "@tests": path.resolve(__dirname, "tests"),
      "@env": path.resolve(__dirname, "env.ts"),
    }
  },
})
