# Competitive Intelligence Setup Guide

## Overview

EKVAAR's competitive intelligence system tracks competitor pricing across Indian fashion e-commerce platforms:
- Myntra
- Ajio
- Amazon India
- Flipkart
- Nykaa

Daily sync runs automatically at 6:00 AM IST, collecting price data and alerting on significant changes (5%+).

---

## Quick Start

### 1. Set Cron Secret

Add to your `.env`:

```env
CRON_SECRET=your-secure-random-string-here
```

Generate a secure random string:
```bash
# macOS/Linux
openssl rand -hex 32

# Or use any random UUID
```

### 2. Deploy Your App

Make sure your EKVAAR app is deployed and accessible via HTTPS URL.

### 3. Set Up cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account

2. Create a new job with these settings:

| Setting | Value |
|---------|-------|
| **Title** | EKVAAR Daily Price Sync |
| **URL** | `https://your-app.vercel.app/api/cron/scrape` |
| **Schedule** | `0 0:30 * * *` (6:00 AM IST = 00:30 UTC) |
| **Timezone** | UTC |
| **HTTP Method** | GET |
| **Headers** | `Authorization: Bearer YOUR_CRON_SECRET_HERE` |

3. Enable the job

### 4. Test Manually

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/scrape
```

Should return:
```json
{
  "message": "Daily sync completed",
  "jobsCreated": 2,
  "jobs": ["abc123", "def456"]
}
```

---

## Alternative: Vercel Cron (If using Vercel)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/scrape",
    "schedule": "30 0 * * *"
  }]
}
```

Note: Vercel Cron passes cron auth automatically on paid plans. For free tier, use cron-job.org.

---

## Adding Competitors

### Via API

```bash
curl -X POST https://your-app.vercel.app/api/scrape/competitors \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"competitorKey": "myntra"}'
```

Available keys: `myntra`, `ajio`, `amazon`, `flipkart`, `nykaa`

### Custom Competitor

```bash
curl -X POST https://your-app.vercel.app/api/scrape/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "customName": "Tata CLiQ",
    "customDomain": "tatacliq.com",
    "customColor": "#E67E22"
  }'
```

---

## Adding Products to Track

### Via API

```bash
curl -X POST https://your-app.vercel.app/api/scrape/products \
  -H "Content-Type: application/json" \
  -d '{
    "competitorId": "competitor-id-here",
    "url": "https://www.myntra.com/jeans/levis/levis-men-navy-blue-slim-fit-jeans/1234567",
    "name": "Levis Navy Blue Slim Fit Jeans",
    "price": 2499,
    "mrp": 2999,
    "ourSku": "EKV-JNS-001"
  }'
```

### Via UI

Open **Competitive Intelligence** in Board Room, use the discovery feature.

---

## Krishna Commands

Once set up, ask Krishna:

- "What's the pricing situation?"
- "Check [product name] price"
- "Any price alerts?"
- "How are we vs competitors?"
- "Sync prices now"

Krishna will query real data and respond with specific numbers.

---

## Monitoring

### View Scrape Jobs

```bash
curl https://your-app.vercel.app/api/scrape/jobs
```

### View Alerts

```bash
curl https://your-app.vercel.app/api/scrape/alerts
```

### Acknowledge Alert

```bash
curl -X PUT https://your-app.vercel.app/api/scrape/alerts \
  -H "Content-Type: application/json" \
  -d '{"id": "alert-id", "acknowledged": true}'
```

---

## Troubleshooting

### No products being scraped

1. Check if competitor URLs are valid
2. Verify Playwright is working (test manually)
3. Check scrape job status: `/api/scrape/jobs`

### Rate limiting

Some platforms (especially Flipkart) have aggressive anti-bot:
- Reduce concurrency in crawler config
- Add proxy rotation
- Space out requests

### Missing selectors

If a platform's CSS selectors changed:
1. Inspect the website
2. Update `src/lib/crawlers/types.ts` `COMPETITOR_CONFIGS`
3. Redeploy

---

## Architecture

```
cron-job.org (6 AM IST)
    ↓
/api/cron/scrape (auth check)
    ↓
Create ScrapeJob per competitor
    ↓
Crawlee worker (Playwright headless)
    ↓
Parse product pages → Update DB
    ↓
Detect price changes → Create alerts
    ↓
Board Room UI + Krishna access
```

---

## Cost

| Component | Cost |
|-----------|------|
| Crawlee | Free (open source) |
| cron-job.org | Free |
| Playwright browsers | Free |
| Database | Free (SQLite via Prisma) |

**Total: $0/month**
