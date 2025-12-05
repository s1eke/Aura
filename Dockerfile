FROM node:24-alpine AS base

# Set Aliyun mirror for Alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
# Install libc6-compat for all stages (needed for Prisma/Next.js on Alpine)
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./

# 2. 设置npm镜像源为阿里云
# Set Aliyun mirror for npm
RUN npm config set registry https://registry.npmmirror.com/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Aliyun mirror again for build scripts
RUN npm config set registry https://registry.npmmirror.com/
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client and types before build
RUN npx prisma generate

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# IMPORTANT: Copy public directory (includes sw.js, manifest.json, icons, etc.)
# This must be copied AFTER standalone to ensure it's in the right location
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy prisma folder to ensure we have the schema if needed later, and a place for the sqlite db
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY ./prisma.config.ts .
COPY ./scripts ./scripts
RUN npm install prisma@7.1.0

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Declare volumes for persistent data
# - /app/public/uploads: User uploaded files (avatars, chat images, backgrounds)
# - /app/db: SQLite database file
VOLUME ["/app/public/uploads", "/app/db"]

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

# Use entrypoint script to initialize DB before starting server
ENTRYPOINT ["./docker-entrypoint.sh"]
