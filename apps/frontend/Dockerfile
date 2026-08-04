FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ENV DATABASE_URL="file:///app/db/custom.db"
RUN mkdir -p /app/db && touch /app/db/custom.db
RUN node node_modules/.bin/prisma generate
RUN node node_modules/next/dist/bin/next build --webpack

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

COPY --from=builder /app ./

# Storage dirs for generated artifacts (images, PDFs, videos)
RUN mkdir -p /app/storage/pdf /app/storage/images /app/storage/videos /app/storage/templates \
    && chmod -R 777 /app/storage

CMD ["sh", "-c", "mkdir -p /app/db && touch /app/db/custom.db && chmod -R 777 /app/db && node node_modules/.bin/prisma db push --accept-data-loss && node node_modules/.bin/next start"]
