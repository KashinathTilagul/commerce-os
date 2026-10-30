# Commerce OS — Inspection Issues (2026-08-21/22)

Full-system inspection + fix session. Items marked FIXED were fixed and verified in this session.

## Infrastructure / runtime

1. FIXED — AI router default `OMNIROUTE_BASE_URL` was the docker hostname (`ENOTFOUND` outside
   docker). Now defaults to `http://localhost:20128/v1` (docker-compose still sets its own).
2. FIXED — Router fallback chain used models that don't exist on the gateway. Defaults are now
   `auto/best-*` (env-overridable via OMNIROUTE_MODEL_FAST/REASONING/VISION); working targets
   also configured in DB (omniroute + auto/best-* + key).
3. OPEN (docs) — npm allow-scripts blocks postinstall on fresh install (prisma engines,
   esbuild...). Fresh clones need `npx prisma generate` (or `npm approve-scripts`).
4. OPEN — Python kernel backend (`apps/backend-py`) not running locally → health `degraded`,
   voice features unavailable.
5. PARTIAL — Gateway image models: all quota-blocked (antigravity/gemini 429 daily cap) or
   credential-less (lmarena 401, flux "no credentials"). App-side now correct: default model
   set to the working gateway model, HF FLUX fallback restored (`HUGGINGFACE_API_KEY` — drop a
   token in .env for real generated photos immediately).

## App bugs (UI)

6. FIXED — Login stayed on /login after successful signIn; now hard-navigates to `/`.
7. FIXED — Launchpad Enter now opens the first filtered app.
8. MINOR/OPEN — Launchpad search is substring ("Notes" matches "Notes & Logs").
9. RESOLVED (not a bug) — "Founder Inbox blocks Assign work" was navigation to Approvals.
10. NOTE — IAB screenshot capture fails on the desktop page (tool-specific).

## AI Workforce deep-test findings

11. FIXED (CRITICAL) — Launchpad overlay never unmounted after opening an app → invisible
    full-screen click-blocker accumulated, eventually making the whole desktop unclickable.
    Fixed: removed framer-motion `layout` from grid cells (blocked AnimatePresence exit) +
    `pointerEvents: 'none'` on exit as a safety net. Verified: overlay count 0 after open.
12. FIXED — Campaign reel videos failed: scene stills were SVG (image fallback) and ffmpeg has
    no SVG decoder → every reel died. Now rasterized to PNG via sharp first. Verified with a
    real reel assembled from the previously-failing assets.
13. FIXED (pre-existing) — `/api/marketing/automation/generate` 500'd on every call:
    `routeObject` invoked with 2 args instead of 3 (missing organizationId). The marketing
    generator had never worked.
14. NOTE — AgentRun provider/model fields stay null (observability gap). Not fixed.
15. NOTE — Redis-backed login rate limiter (429 after ~5 attempts/2min) — by design; test
    suites must cache sessions.

## NEW FEATURE WORK (this session) — Content Studio

- New desktop app "Content Studio" (Marketing Automation, was an orphaned component with no
  UI mount) — registered in the app registry.
- Generate drafts: caption (explicit prompt contract: clear subject, 4-8 emojis, concrete
  details, CTA, banned filler phrases, 8-12 hashtags) + media per format:
  Image / Carousel (3-4 slides w/ progression) / Reel (scene stills → ffmpeg reel) /
  Story (9:16) / Text-only.
- Drafts → Post button → popover with Post now + Schedule (datetime picker).
- Publishing to ALL connected social accounts via the existing Graph API publisher
  (Instagram incl. carousels + reels, Facebook, Threads, LinkedIn) using signed public
  artifact URLs (`/api/public/artifacts` HMAC).
- Scheduling: SCHEDULED tasks auto-publish when due — in-process 60s interval +
  `POST /api/cron/publish-marketing` (x-cron-secret) for external cron.
- MarketingTask schema: + format, mediaArtifactIds, publishResults (pushed to DB).

## Verified working (end-to-end)

- 22/22 desktop apps open and render (Playwright walk, incl. new Content Studio).
- 20/20 unit tests; lint 0 errors; typecheck clean on all changed files.
- Marketing pipeline E2E: carousel draft (4 media, 10 hashtags, emoji+subject+CTA caption) →
  post-now (correct per-platform result recording) → schedule +65s → in-process scheduler
  auto-published on time to both selected platforms.
- Content Studio UI: opens via Launchpad+Enter, 5 format options, media thumbnails, Post
  popover with Post now + datetime + Schedule. Launchpad no longer blocks clicks after use.
- Docs/images/video generation through agents (campaign CL-001: CONTENT completed via
  gateway; reel assembled after the SVG fix).

## Blockers remaining (external, not code)

- Real image pixels: needs either the gateway image quota to reset, an upstream image
  credential on OmniRoute, or a HUGGINGFACE_API_KEY in .env (fallback is wired).
- Actual social posting: needs OAuth client IDs (META/THREADS/LINKEDIN) configured and
  accounts connected via Integrations; media URLs must be publicly reachable (deployed
  PUBLIC_BASE_URL, not localhost) since platform APIs fetch the media.
