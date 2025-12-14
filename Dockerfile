FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --include=optional

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars for Next.js public variables
ARG NEXT_PUBLIC_LIVEKIT_URL=wss://livekit-server.technosmart.id
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}

RUN npm run build

# Production image - simplified with only essential migration files
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy files needed for database migrations
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy all node_modules for drizzle-kit migrations
# Note: This increases image size but ensures all dependencies are available
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "echo '🚀 Starting LiveKit App deployment...' && \
  if [ -z \"$DATABASE_URL\" ]; then \
    echo '⚠️  WARNING: DATABASE_URL is not set. Skipping migrations.'; \
  else \
    echo '📦 Running database migrations...' && \
    yes | npx drizzle-kit push && \
    echo '✅ Database migrations completed successfully!'; \
  fi && \
  echo '🌐 Starting Next.js server...' && \
  exec node server.js"]
