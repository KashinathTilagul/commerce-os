# EKVAAR OS

**India's First All-Time Fashion House — Operating System**

A macOS-style desktop environment built for running EKVAAR's fashion brand from a single interface. Every module is purpose-built for the business: sales, inventory, finance, campaigns, AI agents, and a living voice assistant named Krishna.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| State | Zustand |
| Database | PostgreSQL via Prisma |
| Auth | NextAuth v4 (credentials) |
| AI | Claude API (Anthropic) via `/api/jarvis/chat` |
| Voice | Web Speech API (STT) + SpeechSynthesis (TTS) |
| Realtime | Server-Sent Events (SSE) |

---

## Features

### Desktop OS Shell
- macOS Big Sur-style squircle app icons, dock, menu bar, window frames
- Multi-window management with drag, resize, minimize, maximize, z-ordering
- Spotlight search (`Cmd+K`) — fuzzy search across all apps
- Launchpad (`F4` / `Cmd+L`) — full-screen app grid
- Dark/light mode with EKVAAR brand color system
- Boot screen with animated progress bar

### Menu Bar
- Live clock — click to open Notifications panel
- Notifications panel — unread badge, order/revenue/AI insights, DND toggle
- WiFi live status, Battery level (Browser Battery API), Volume slider
- Krishna AI and Spotlight quick-launch buttons

### Krishna — Voice AI Assistant
- Click mic to start listening, click again to stop (no hold-to-talk)
- Silence auto-detection — sends after 2.2 s pause
- **Conversational loop** — mic auto-restarts after Krishna responds
- Male voice (Google UK Male → Microsoft Guy → Daniel → fallback)
- Sentence-chunked TTS for natural Jarvis-like pacing
- Falls back gracefully to text chat if mic unavailable

### Business Modules

| App | Purpose |
|-----|---------|
| **Board Room** | KPI dashboard — revenue, orders, brand health |
| **Founder Inbox** | Approval queue for founder decisions |
| **Digital Employees** | AI agent roster (CEO, CMO, CTO, CFO, COO…) |
| **Issues** | Kanban issue tracker |
| **Sales & Orders** | Order management, fulfillment, channels |
| **Finance** | P&L, cash flow, ledger |
| **Inventory & Ops** | SKU management, stock levels, supplier ops |
| **Originals** | Member management, restoration program |
| **Campaigns** | Content calendar, pillar-based campaign builder |
| **Brand Guardian** | Brand compliance scanner |
| **AI Infrastructure** | Agent health, task logs, system status |
| **Integrations** | Shopify, Stripe, Razorpay, Gmail, GitHub, Slack |

### Utility Apps

| App | Purpose |
|-----|---------|
| **Terminal** | Live event stream + agent logs |
| **Activity Monitor** | System + AI resource usage |
| **Files** | Document explorer |
| **Notes** | Founder notepad with persistence |
| **Calendar** | Schedule and events |
| **Music** | EKVAAR Sound — ambient Web Audio player |
| **Calculator** | Standard calculator |
| **Settings** | Theme, accent, notifications, governance |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Setup

```bash
git clone https://github.com/KashinathTilagul/Ekvaar.git
cd Ekvaar/apps/frontend

npm install

cp .env.example .env
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, ANTHROPIC_API_KEY

npx prisma db push
curl -X POST http://localhost:3000/api/seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:5432/ekvaar
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── api/           # Auth, dashboard, customers, jarvis, seed
│   │   ├── login/         # Login page
│   │   └── page.tsx       # Desktop shell root
│   ├── components/ekvaar/
│   │   ├── desktop/       # Dock, menu-bar, window-frame, spotlight, jarvis…
│   │   └── modules/       # App windows (command-center, sales, finance…)
│   └── lib/
│       ├── auth.ts        # NextAuth config
│       ├── auth-guard.ts  # Node-only route protection
│       ├── security.ts    # Edge-safe rate limiting + CSP helpers
│       ├── window-store.ts
│       └── theme-store.ts
└── prisma/schema.prisma
```

---

## Security

- Edge middleware: rate limiting, CSP with nonce, strict security headers
- `Permissions-Policy: microphone=(self)` — mic scoped to Krishna only
- Auth on all API routes via `requireAuth()` / `requireRole()`
- `.env` gitignored; secrets never committed

---

## Brand System

| Name | Hex | Role |
|------|-----|------|
| Noor | `#0A0A0A` | Primary dark |
| Rui | `#F5F1EA` | Primary light |
| Agni | `#C8302A` | Action / brand red |
| Neel | `#1F3A5F` | Data / navy |
| Arav | `#2F4F3A` | Growth / forest |
| Gulabi | `#D4859B` | Community / rose |

---

## Deployment

Configured for Vercel. Set env vars in dashboard, then:

```bash
vercel --prod
```

---

*Built by Kashinath Tilagul — Founder, EKVAAR*
