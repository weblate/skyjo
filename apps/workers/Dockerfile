ARG PROJECT=@skymo/workers

FROM node:24.3-alpine AS base
RUN apk update && apk add --no-cache libc6-compat jemalloc && npm install -g pnpm@10.12.4 turbo@2.3.3

FROM base AS pruner
ARG PROJECT
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

FROM base AS builder
ARG PROJECT
WORKDIR /app
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/json/ .

RUN pnpm i --ignore-scripts
COPY --from=pruner /app/out/full/ .
RUN pnpm run build --filter=${PROJECT}

ENV NODE_ENV=production
RUN pnpm install --prod --ignore-scripts

FROM base AS runner
ARG PROJECT
WORKDIR /app
COPY --from=builder /app .

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs

# Set ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

WORKDIR /app/apps/workers
ENV NODE_ENV=production
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

CMD ["pnpm", "run", "prod"]
