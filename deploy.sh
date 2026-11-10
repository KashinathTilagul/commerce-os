#!/bin/bash
set -eo pipefail

DOMAIN="${DOMAIN:-commerce.abata.tech}"
RELEASE_TAG="v3.5.0-platform-ready"
MAINTAINER="Kashinath Tilagul"

echo "===================================================="
echo "  COMMERCE OS — Production Deployment Pipeline      "
echo "  Created & Maintained by: $MAINTAINER               "
echo "  Release Tag: $RELEASE_TAG                         "
echo "===================================================="

# 1. Pre-flight Checks: Verify Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Please install Docker."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "[!] Docker Compose plugin not found."
    exit 1
fi

# 2. Environment Verification
echo "[*] Auditing environment variables..."
if [ ! -f .env ]; then
    echo "[!] Missing .env. Copy .env.template to .env and configure it first."
    exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

MISSING_ENVS=()
REQUIRED_ENVS=(
    DATABASE_URL DIRECT_URL NEXTAUTH_SECRET NEXTAUTH_URL NEXT_PUBLIC_APP_URL
    JWT_SECRET CRON_SECRET ARTIFACT_SIGNING_SECRET N8N_ENCRYPTION_KEY
    N8N_EKVAAR_WEBHOOK_SECRET OPEN_DESIGN_API_TOKEN COGNEE_LLM_API_KEY
)
for ENV_NAME in "${REQUIRED_ENVS[@]}"; do
    [ -z "${!ENV_NAME:-}" ] && MISSING_ENVS+=("$ENV_NAME")
done

if [ ${#MISSING_ENVS[@]} -ne 0 ]; then
    echo "[!] Missing required environment variables: ${MISSING_ENVS[*]}"
    echo "[!] Deployment stopped. Production secrets are never generated ephemerally."
    exit 1
fi

EXPECTED_ORIGIN="https://$DOMAIN"
if [ "$NEXTAUTH_URL" != "$EXPECTED_ORIGIN" ] || [ "$NEXT_PUBLIC_APP_URL" != "$EXPECTED_ORIGIN" ]; then
    echo "[!] NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must both equal $EXPECTED_ORIGIN"
    exit 1
fi

if [[ "$DATABASE_URL" == *":6543/"* ]] && [[ "$DATABASE_URL" != *"pgbouncer=true"* ]]; then
    echo "[!] DATABASE_URL uses transaction pooling on port 6543 but lacks pgbouncer=true."
    exit 1
fi

# 3. Create Required Storage Directories
echo "[*] Ensuring storage directory structure exists..."
mkdir -p apps/frontend/storage/{pdf,images,videos,templates}
chmod -R 750 apps/frontend/storage 2>/dev/null || true

# 4. Firewall & Certificate Setup (Soft Fail / Non-blocking)
if command -v iptables &> /dev/null; then
    sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
fi

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "[*] Certbot certificate detected. Checking renewal..."
    sudo certbot renew --quiet 2>/dev/null || true
fi

# 5. Build and Deploy Containers with Rollback Guard
echo "[*] Building container images..."
docker compose --profile ai --profile proxy build --parallel

echo "[*] Starting containers..."
docker compose --profile ai --profile proxy up -d

# 6. Health Check Polling Loop (Zero-downtime / Validation)
echo "[*] Polling service health status (waiting up to 30s)..."
MAX_ATTEMPTS=15
ATTEMPT=1
HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if docker compose exec -T frontend node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo "[*] Attempt $ATTEMPT/$MAX_ATTEMPTS: frontend health check failed. Retrying in 2s..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTHY" = false ]; then
    echo "\n[!] PRODUCTION HEALTH CHECK FAILED!"
    echo "[!] Fetching recent container logs for diagnostics:"
    docker compose logs --tail=50
    echo "\n[!] Stopping the failed deployment. Previous images and volumes are preserved."
    docker compose stop frontend nginx || true
    exit 1
fi

echo "[*] Service health check PASSED!"

# 7. Run Production Smoke Tests from inside the frontend container
echo "[*] Executing production smoke test suite..."
docker compose exec -T frontend node - <<'NODE' || {
const endpoints = ['/api/health', '/api/health/database', '/api/health/storage']
Promise.all(endpoints.map(async (path) => {
  const response = await fetch(`http://localhost:3000${path}`)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  console.log(`[ok] ${path}`)
})).catch((error) => {
  console.error(error.message)
  process.exit(1)
})
NODE
    echo "[!] Smoke test suite FAILED."
    exit 1
}

echo "===================================================="
echo "  ✅ DEPLOYMENT SUCCESSFUL!                         "
echo "  Release: $RELEASE_TAG                             "
echo "  Target Domain: https://$DOMAIN                   "
echo "===================================================="
