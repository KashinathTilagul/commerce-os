FROM ghcr.io/elie222/rakazo/app@sha256:b1bef3731818a601d256be4359f9450401813329a3c9b1b813c70f2a1647f0ea

USER root
COPY model-credential-verifier.ts /app/apps/api/src/model-credential-verifier.ts
COPY patch-runtime.mjs /tmp/patch-runtime.mjs
RUN node /tmp/patch-runtime.mjs && rm /tmp/patch-runtime.mjs
USER node
