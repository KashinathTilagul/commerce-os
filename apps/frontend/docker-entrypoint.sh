#!/bin/sh
set -eu

# Clear NODE_EXTRA_CA_CERTS when an optional CA bundle (e.g. Supabase) is absent.
if [ -n "${NODE_EXTRA_CA_CERTS:-}" ] && [ ! -f "$NODE_EXTRA_CA_CERTS" ]; then
  unset NODE_EXTRA_CA_CERTS
fi

mkdir -p /app/storage/pdf /app/storage/images /app/storage/videos /app/storage/audio /app/storage/templates

SECRETS_FILE="/app/storage/.runtime-secrets"
if [ -z "${NEXTAUTH_SECRET:-}" ] || [ -z "${JWT_SECRET:-}" ] || [ -z "${CRON_SECRET:-}" ] || [ -z "${ARTIFACT_SIGNING_SECRET:-}" ]; then
  if [ -f "$SECRETS_FILE" ]; then
    for key in NEXTAUTH_SECRET JWT_SECRET CRON_SECRET ARTIFACT_SIGNING_SECRET; do
      line_val="$(grep -m1 "^${key}=" "$SECRETS_FILE" | cut -d= -f2- || true)"
      case "$key" in
        NEXTAUTH_SECRET) [ -z "${NEXTAUTH_SECRET:-}" ] && NEXTAUTH_SECRET="$line_val" ;;
        JWT_SECRET) [ -z "${JWT_SECRET:-}" ] && JWT_SECRET="$line_val" ;;
        CRON_SECRET) [ -z "${CRON_SECRET:-}" ] && CRON_SECRET="$line_val" ;;
        ARTIFACT_SIGNING_SECRET) [ -z "${ARTIFACT_SIGNING_SECRET:-}" ] && ARTIFACT_SIGNING_SECRET="$line_val" ;;
      esac
    done
  fi

  gen_secret() {
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
  }

  NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(gen_secret)}"
  JWT_SECRET="${JWT_SECRET:-$(gen_secret)}"
  CRON_SECRET="${CRON_SECRET:-$(gen_secret)}"
  ARTIFACT_SIGNING_SECRET="${ARTIFACT_SIGNING_SECRET:-$(gen_secret)}"

  if [ ! -f "$SECRETS_FILE" ]; then
    umask 077
    printf '%s\n' \
      "NEXTAUTH_SECRET=${NEXTAUTH_SECRET}" \
      "JWT_SECRET=${JWT_SECRET}" \
      "CRON_SECRET=${CRON_SECRET}" \
      "ARTIFACT_SIGNING_SECRET=${ARTIFACT_SIGNING_SECRET}" \
      > "$SECRETS_FILE"
  fi

  export NEXTAUTH_SECRET JWT_SECRET CRON_SECRET ARTIFACT_SIGNING_SECRET
fi

sh /migration/migrate-production.sh
cd /app
exec node server.js
