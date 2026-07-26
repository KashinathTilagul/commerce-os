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

COPY --from=builder /app ./

CMD ["sh", "-c", "mkdir -p /app/db && touch /app/db/custom.db && chmod -R 777 /app/db && node node_modules/.bin/prisma db push --accept-data-loss --force-reset && node node_modules/.bin/next start"]
