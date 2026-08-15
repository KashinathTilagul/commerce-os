FROM node:22-slim AS builder
WORKDIR /app

# System deps for node-gyp / native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
# Keep npm's download cache out of the committed layer. On the small
# production runner the cache plus node_modules used to make BuildKit require
# more than twice the actual dependency footprint while applying this layer.
RUN npm_config_cache=/tmp/npm-cache npm install --legacy-peer-deps --no-audit --no-fund \
    && rm -rf /tmp/npm-cache /root/.npm
COPY . .
# Dummy URL for prisma generate only — runtime uses the real DATABASE_URL from docker-compose
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# FFmpeg for video generation, Chromium deps for PDF generation (puppeteer + @sparticuz/chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg espeak-ng \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Next's standalone trace contains only the server dependencies that are
# reachable at runtime. Copying the complete development dependency tree made
# the production image several gigabytes larger than the app actually needs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Keep schema synchronization available without restoring the full frontend
# dependency tree. The migration CLI is isolated from the standalone server.
WORKDIR /migration
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
RUN npm_config_cache=/tmp/npm-cache npm init -y >/dev/null \
    && npm_config_cache=/tmp/npm-cache npm install --no-save --no-audit --no-fund \
      prisma@7.9.0 @prisma/client@7.9.0 @prisma/adapter-pg@7.9.1 pg@8.22.0 \
    && rm -rf /tmp/npm-cache /root/.npm

WORKDIR /app

# Storage dirs for generated artifacts (images, PDFs, videos)
RUN mkdir -p /app/storage/pdf /app/storage/images /app/storage/videos /app/storage/audio /app/storage/templates \
    && chmod -R 777 /app/storage

CMD ["sh", "-c", "cd /migration && node node_modules/prisma/build/index.js db push --accept-data-loss && cd /app && node server.js"]
