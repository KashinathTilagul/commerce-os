FROM node:22-bookworm-slim AS builder

RUN corepack enable
WORKDIR /src

COPY --chmod=755 vendor/rakazo/ ./
COPY infra/rakazo/model-credential-verifier.ts apps/api/src/model-credential-verifier.ts
COPY infra/rakazo/patch-runtime.mjs /tmp/patch-runtime.mjs
COPY infra/rakazo/patch-web-ui.mjs /tmp/patch-web-ui.mjs

RUN pnpm install --frozen-lockfile \
  && node /tmp/patch-runtime.mjs /src/apps/api/src/router.ts \
  && RAKAZO_SHELL_PATH=/src/apps/web/src/pages/Shell.tsx node /tmp/patch-web-ui.mjs \
  && pnpm --filter @rakazo/db generate \
  && RAKAZO_ALLOW_DEV_SECRETS=1 pnpm --filter @rakazo/web build \
  && pnpm --filter @rakazo/api --prod deploy /out/api \
  && install -d /out/worker/src /out/web-runtime/dist \
  && cp -R apps/worker/src/. /out/worker/src/ \
  && cp apps/worker/package.json /out/worker/package.json \
  && cp -R apps/web/dist/. /out/web-runtime/dist/

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN npm install --global --omit=dev tsx@4.20.5 \
  && npm install --prefix /app/web-runtime --omit=dev vite@7.3.6 \
  && npm cache clean --force

COPY --from=builder --chown=node:node /out/api /app/api
COPY --from=builder --chown=node:node /out/worker /app/worker
COPY --from=builder --chown=node:node /out/web-runtime/dist /app/web-runtime/dist
COPY --chown=node:node infra/rakazo/vite.runtime.config.ts /app/web-runtime/vite.runtime.config.ts
COPY --chown=node:node vendor/rakazo/apps/web/src/screen-proxy.ts /app/web-runtime/screen-proxy.ts

RUN prisma_path="$(find /app/api/node_modules/.pnpm -path '*/node_modules/prisma' -type d | head -n 1)" \
  && test -n "$prisma_path" \
  && ln -s "$prisma_path" /app/api/node_modules/prisma \
  && ln -s /app/api/node_modules /app/worker/node_modules \
  && install -d -m 750 -o node -g node /data /app/web-runtime/node_modules/.vite-temp

EXPOSE 3100 5173
USER node
CMD ["tsx", "/app/api/src/index.ts"]
