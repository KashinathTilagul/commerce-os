# EKVAAR OS — Hosting Architecture & Deployment Specification

**Milestone Tag:** `v3.3.1-release-stability`  
**Status:** Production Deployment Guide

---

## 1. Container Topology

Ekvaar OS runs as 3 dockerized services defined in [docker-compose.yml](file:///Users/kashinathtilagul/Desktop/Ekvaar/docker-compose.yml):

```
                                  [ Internet / User ]
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │   Nginx Container   │
                                │   (Ports 80 / 443)  │
                                └──────────┬──────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                        ▼                                     ▼
             ┌─────────────────────┐               ┌─────────────────────┐
             │ Next.js Web Frontend│               │ Python FastAPI      │
             │ (Port 3000)         │ <───────────> │ Voice & Tools       │
             │ SQLite / Prisma ORM │               │ (Port 8000)         │
             └─────────────────────┘               └─────────────────────┘
```

---

## 2. Production Health Check Suite

The system exposes 4 diagnostic health endpoints:

- **`/api/health`**: Aggregated health check (returns HTTP `200` if healthy, `503` if degraded). Reports deployment release version (`v3.3.1-release-stability`).
- **`/api/health/database`**: Verifies database connectivity and query execution against Prisma.
- **`/api/health/kernel`**: Verifies connectivity to the Python FastAPI kernel.
- **`/api/health/storage`**: Validates file system write/read capabilities in `/app/storage`.

---

## 3. Automated Deployment & Rollback Protocol

Deploys are executed via [deploy.sh](file:///Users/kashinathtilagul/Desktop/Ekvaar/deploy.sh):

```bash
./deploy.sh
```

### Deployment Pipeline Stages:
1. **Pre-flight Check**: Validates Docker and Docker Compose availability.
2. **Environment Audit**: Checks critical environment variables (`NEXTAUTH_SECRET`, `JWT_SECRET`, `DATABASE_URL`).
3. **Directory Provisioning**: Ensures storage subdirectories exist (`/apps/frontend/storage/{pdf,images,videos,templates}`).
4. **Container Build & Launch**: Executes `docker compose build` and `docker compose up -d`.
5. **Health Check Polling**: Polls `http://localhost:3000/api/health` up to 15 times (30s timeout).
6. **Smoke Test Execution**: Executes `npx tsx scripts/smoke-test.ts`.
7. **Rollback Guard**: If health checks or smoke tests fail, logs are dumped and container restart/rollback is triggered automatically.

---

## 4. Release Verification Procedure

Before publishing a release tag:

```bash
# 1. Run local smoke test
npx tsx scripts/smoke-test.ts

# 2. Commit and tag release
git add .
git commit -m "fix(platform): stabilize deployment pipeline and production health checks"
git tag v3.3.1-release-stability
git push origin main --tags
```
