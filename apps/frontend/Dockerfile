FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
ENV DATABASE_URL=file:/app/db/custom.db
RUN bunx prisma generate
RUN bunx prisma db push --skip-generate
# ponytail: run next build with node, not bun — bun triggers turbopack path in Next.js 14
RUN node node_modules/next/dist/bin/next build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["bun", "server.js"]
