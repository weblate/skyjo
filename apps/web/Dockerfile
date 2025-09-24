ARG PROJECT=@skymo/web

FROM node:24.3-alpine AS base

# Pruner stage - extract only needed files
FROM base AS pruner
ARG PROJECT
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

# Builder stage - build the app
FROM base AS builder
ARG PROJECT
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@10.12.4
WORKDIR /app

# Copy lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install ALL dependencies (dev + prod)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY --from=pruner /app/out/full/ .

# Build the app
RUN pnpm turbo build --filter=${PROJECT}

# Runtime stage - minimal final image
FROM node:24.3-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Create cache directory with proper permissions
RUN mkdir -p /app/apps/web/.next/cache && \
    chown -R nextjs:nodejs /app/apps/web/.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]