FROM oven/bun:1 AS builder
WORKDIR /app

# better-sqlite3 requires Python + make to compile its native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install
COPY . .
ENV DATABASE_URL="file:///app/db/custom.db"
RUN mkdir -p /app/db && touch /app/db/custom.db
RUN bun run prisma generate
RUN bun run prisma db push --skip-generate --accept-data-loss
RUN node node_modules/next/dist/bin/next build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Runtime also needs better-sqlite3 native addon — copy compiled node_modules from builder
COPY --from=builder /app ./

CMD ["sh", "-c", "touch /app/db/custom.db && bun run prisma db push --skip-generate --accept-data-loss && bun run start"]
