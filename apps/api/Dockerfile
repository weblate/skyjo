FROM node:24.11.1-alpine AS base

# Install base dependencies
FROM base AS deps
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN yarn global add turbo

# Copy everything and prune for API
COPY . .
RUN turbo prune @skymo/api --docker

# Install dependencies stage
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# First install dependencies (as they change less often)
COPY --from=deps /app/out/json/ .
COPY --from=deps /app/out/pnpm-lock.yaml* ./

# Use pnpm for consistency with your project
RUN npm install -g pnpm@10.22.0 --ignore-scripts && \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy the full pruned source
COPY --from=deps /app/out/full/ .

# Install tsx globally for production runtime
RUN npm install -g tsx --ignore-scripts

# Build the project (only if needed for packages)
RUN pnpm turbo build --filter=@skymo/api

# Production runtime stage
FROM base AS runner
WORKDIR /app

# Install only runtime essentials and create non-root user
RUN apk update && \
    apk add --no-cache libc6-compat && \
    npm install -g pnpm@10.22.0 --ignore-scripts tsx && \
    rm -rf /var/cache/apk/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy application from installer
COPY --from=installer --chown=nodejs:nodejs /app .

# Set to production
ENV NODE_ENV=production

# Switch to non-root user
USER nodejs

# Start the API using tsx
WORKDIR /app/apps/api
CMD ["npm", "run", "prod"]
