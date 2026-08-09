FROM node:22-slim AS builder
WORKDIR /app

# Enable Corepack for reproducible installs
RUN corepack enable && corepack prepare bun@1.3.12 --activate

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install-cache \
    bun install --frozen-lockfile
COPY . .
# Dummy URL for prisma generate only — runtime uses the real DATABASE_URL from docker-compose
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN --mount=type=cache,target=/app/.next/cache \
    bun run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# FFmpeg for video generation, Chromium deps for PDF generation (puppeteer + @sparticuz/chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/prisma ./prisma

# Storage dirs for generated artifacts (images, PDFs, videos)
RUN mkdir -p /app/storage/pdf /app/storage/images /app/storage/videos /app/storage/templates \
    && chmod -R 777 /app/storage

CMD ["sh", "-c", "node node_modules/.bin/prisma db push --accept-data-loss && node node_modules/.bin/next start"]
