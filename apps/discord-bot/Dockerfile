ARG PROJECT=@skymo/discord-bot

# Base stage with common dependencies
FROM node:24.3-alpine AS base
RUN apk update && \
    apk add --no-cache libc6-compat jemalloc && \
    npm install -g pnpm@10.12.4 turbo@2.3.3 && \
    rm -rf /var/cache/apk/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Pruner stage
FROM base AS pruner
ARG PROJECT
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

# Builder stage with optimized layer caching
FROM base AS builder
ARG PROJECT
WORKDIR /app

# Copy package files first for better caching
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/json/ .

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy source files separately for better cache invalidation
# First copy package sources (changes less frequently)
COPY --from=pruner /app/out/full/packages ./packages
COPY --from=pruner /app/out/full/apps ./apps
COPY --from=pruner /app/out/full/turbo.json ./turbo.json
COPY --from=pruner /app/out/full/tsconfig.json ./tsconfig.json

# Build with Turbo cache mount
RUN --mount=type=cache,target=/app/.turbo \
    pnpm run build --filter=${PROJECT}

# Install production dependencies
ENV NODE_ENV=production
RUN pnpm install --prod --ignore-scripts

# Runtime stage
FROM base AS runner
ARG PROJECT
WORKDIR /app
ENV NODE_ENV=production
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

# Copy built application
COPY --from=builder /app .

# Set ownership and switch to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

WORKDIR /app/apps/discord-bot

CMD ["pnpm", "run", "start"] 