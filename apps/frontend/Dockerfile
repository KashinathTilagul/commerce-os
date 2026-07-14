FROM oven/bun:1 AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install
COPY . .
ENV DATABASE_URL=file:/app/db/custom.db
RUN bunx prisma generate
# ponytail: needed at build time too — next build statically prerenders /api
# routes that query the DB, against this stage's own throwaway sqlite file.
RUN bunx prisma db push --skip-generate --accept-data-loss
RUN node node_modules/next/dist/bin/next build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY --from=builder /app ./
# ponytail: db push runs at container start (not build time) because the sqlite
# file lives on a runtime volume mount that's empty on first boot/redeploy.
CMD ["sh", "-c", "bunx prisma db push --skip-generate --accept-data-loss && bun run start"]
