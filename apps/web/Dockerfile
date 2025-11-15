ARG PROJECT=@skymo/web

FROM node:24.3-alpine AS base

# Pruner stage - extract only needed files
FROM base AS pruner
ARG PROJECT
RUN npm install -g turbo --ignore-scripts
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

# Builder stage - build the app
FROM base AS builder
ARG PROJECT

# Accept environment variables as build arguments
ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_DISCORD_URL
ARG NEXT_PUBLIC_STATUS_URL
ARG NEXT_PUBLIC_GITHUB_URL
ARG NEXT_PUBLIC_RELEASE_NOTES_URL
ARG NEXT_PUBLIC_WEBLATE_URL

# Set environment variables for the build process
ENV NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ENV NEXT_PUBLIC_CONTACT_EMAIL=${NEXT_PUBLIC_CONTACT_EMAIL}
ENV NEXT_PUBLIC_DISCORD_URL=${NEXT_PUBLIC_DISCORD_URL}
ENV NEXT_PUBLIC_STATUS_URL=${NEXT_PUBLIC_STATUS_URL}
ENV NEXT_PUBLIC_GITHUB_URL=${NEXT_PUBLIC_GITHUB_URL}
ENV NEXT_PUBLIC_RELEASE_NOTES_URL=${NEXT_PUBLIC_RELEASE_NOTES_URL}
ENV NEXT_PUBLIC_WEBLATE_URL=${NEXT_PUBLIC_WEBLATE_URL}

RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm@10.22.0 --ignore-scripts
WORKDIR /app

# Copy lockfile and package.json files
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install ALL dependencies (dev + prod)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

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

# Create cache directories with proper permissions
RUN mkdir -p /app/apps/web/.next/cache/fetch-cache && \
    mkdir -p /app/apps/web/.next/cache/images && \
    chown -R nextjs:nodejs /app/apps/web/.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]