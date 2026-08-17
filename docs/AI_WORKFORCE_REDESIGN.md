# AI Workforce — Automated Task Execution & UI Redesign

Status: DESIGN (decision-complete, ready for implementation)
Scope: the **AI Workforce** application only (`apps/frontend`, module `workforce`)
Companion artifact: UI mockup → `docs/assets/ai-workforce-stepwise-mockup.html`

---

## 1. Ground truth (what exists today)

Verified against code on branch `fix/overrides-dedupe-and-stray-dir`:

| Concern | Current implementation |
|---|---|
| Entry point | `overview-page.tsx` — "Krishna Work Center", prompt **"What should Krishna handle?"** → `POST /api/campaign-launches` |
| Planner | `lib/work-request-planner.ts` — regex routing: CONTENT→MKT_CONTENT, IMAGE→DES_IMG, VIDEO/AUDIO→MKT_VIDEO, PDF→EXE_SUMMARY, finance→CFO, ops→OPS_MANAGER, legal→LEG_COMPLIANCE, product→CPO, strategy→GROWTH, else ANSWER→CEO; full-campaign regex → 14-item `CAMPAIGN_ITEMS` |
| Execution | `lib/campaign-runner.ts` lease loop (20 cycles) → `lib/agent-worker.ts runAgentWork()` → `routeText('reasoning')` → `GENERATE_IMAGE/VIDEO/PDF/AUDIO` blocks → `image-generator` / `video-generator` / `pdf-generator` / `audio-generator` → `Artifact` rows served at `/api/artifacts/:id` |
| Activity log | `GET /api/activity` → last 50 `Event` rows, **unfiltered**. Events written inside `runAgentWork` (`AGENT_WORK`), `handleRejection` (`ISSUE_ESCALATED`), etc. |
| Instagram | `lib/oauth.ts` stores `instagram` token (accountId + accessToken); `lib/social-publisher.ts` publishes feed/carousel/reel via Graph API containers |
| Revenue data | `lib/business-snapshot.ts` aggregates `Transaction` rows (revenue/expenses, ₹ lakh) — this is the "Revenue application" data source |
| Shopify | read-only verified (`/api/campaign-launches/readiness/shopify`); write path exists only inside campaign publish coordinator |
| Brand assets | `Branding/` (6 colors, logos, brand book). **Not wired** into any generator today |
| Silent research | **Does not exist** — net-new feature |
| Known live defects | `docs/AI_WORKFORCE_ACCEPTANCE.md` items 1–10 (image provider "User not found", video-in-iframe, etc.). Item 6 (media gating) is already fixed via `shouldExecuteMedia` |

Theme (must not change): dark glass UI — `GlassPanel`, `bg-white/[0.02..0.12]`, borders `white/[0.06..0.08]`, accent `cyan-300` (`#67e8f9`), `font-display`, 9–13px text, status palette from `STATUS_COLORS` (emerald/cyan/sky/red on 10% alpha).

---

## 2. Requirements → design decisions

| Requirement | Decision |
|---|---|
| Auto-execute every requested task type | Extend `planWorkRequest` with intents: `SOCIAL_POST` (Instagram feed/story/reel/carousel/ad), `SHOPIFY_UPDATE` (one/all products), `FINANCE_REPORT` (PDF with revenue data), `OS_REPORT` (control/steps report). Runner already executes automatically on create (`void runCampaignLaunch`) — no manual "Run" needed for REQUEST kind |
| Brand guidelines enforced for all media | New `lib/brand-guard.ts`. Injected into every GENERATE_* instruction and every content/system prompt; logo pulled from knowledge base as `referenceImage`; video/PDF templates restricted to the 6 signature colors |
| Silent research hidden from activity log | New `CampaignLaunch.hidden` flag. Planner tags research intents. `runAgentWork` writes a **sanitized** event (`Work blocked`, empty payload) for hidden work; hidden launches/issues filtered out of every list endpoint |
| Results only when explicitly requested | Task cards show status/progress only. Output panel renders only after an explicit **"Show result"** click or Krishna command "show me the results" |
| Step-by-step UI, one place | Overview rebuilt as a 4-step flow: **Ask → Plan → Execute → Deliver**, single screen, same theme |
| Remove old redundant tasks/processes | Deletion list in §8 |

---

## 3. Architecture

```
Founder prompt ("make an image of our logo")
        │
        ▼
POST /api/campaign-launches  ──▶  planWorkRequest(brief)          [planner, extended]
        │                              │ kind: REQUEST | CAMPAIGN | RESEARCH
        │                              ▼
        │                        createCampaignLaunch({ items, hidden })
        ▼
runCampaignLaunch(orgId, launchId)     [lease loop — unchanged]
        │
        ▼
runAgentWork(org, agentId, issueId)    [extended: brand guard + hidden mode]
        ├── system prompt += BRAND GUARDIAN section      (lib/brand-guard.ts)
        ├── GENERATE_* block extraction                  (unchanged)
        ├── generateImage/Video/PDF/Audio                (image gen: + logo referenceImage)
        ├── Artifact row → /api/artifacts/:id
        ├── Event log:
        │     hidden launch  → { type:'WORK_BLOCKED', summary:'Work blocked', payload:'{}' }
        │     normal launch  → existing AGENT_WORK event
        └── issue comment holds the deliverable (results stay hidden in UI until requested)

Deliver (explicit request only)
        ├── UI: "Show result" button on a COMPLETED item → EmployeeOutput renders
        ├── Instagram one-click: POST /api/publish/instagram { artifactId, caption }
        │       → social-publisher.publishInstagram (Graph API) — single click, no extra gate
        └── Shopify: POST /api/workforce/shopify-update { productId?|'ALL', newDescription }
                → Admin GraphQL productUpdate mutation
```

### 3.1 Components

| Component | File | Change |
|---|---|---|
| Planner | `src/lib/work-request-planner.ts` | Add RESEARCH kind + 4 new intents (§3.2) |
| Brand guard | `src/lib/brand-guard.ts` **(new)** | Brand rules, prompt sections, color/palette assertions, logo lookup (§3.3) |
| Agent worker | `src/lib/agent-worker.ts` | Inject brand guard into `system`; hidden-launch event sanitization (§3.4) |
| Launch model | `prisma/schema.prisma` | `CampaignLaunch.hidden Boolean @default(false)` |
| Activity API | `src/app/api/activity/route.ts` | No change needed — sanitization happens at write time (write-time filter is the single enforcement point; a read-time filter could be bypassed by any future reader) |
| List APIs | `campaign-launches.ts listCampaignLaunches`, issues list | `where: { hidden: false }` (hidden work is invisible in Overview/Projects/Issues) |
| Publish | `src/app/api/publish/instagram/route.ts` **(new)** | One-click publish wrapper around `social-publisher` |
| Shopify write | `src/app/api/workforce/shopify-update/route.ts` **(new)** | Admin GraphQL `productUpdate` for one or all products |
| UI | `overview-page.tsx` rebuilt as step wizard; `activity-feed.tsx` unchanged (renders `Work blocked` rows) | §4 |

### 3.2 Planner additions (`planWorkRequest`)

```ts
// order matters — checked before generic media regexes
const RESEARCH = /\b(research|investigate|background check|deep dive|study)\b/i
const INSTAGRAM = /\b(instagram|story|stories|reel|carousel|ig post)\b/i
const SHOPIFY = /\b(shopify|product description)\b/i
const FIN_REPORT = /\b(finance|financial|p&l|revenue)\b.*\b(report|fiscal|fy)\b/i
```

- `RESEARCH.test(brief)` → `kind:'RESEARCH'`, single item `{ type:'ANSWER', assigneeCode:'GROWTH', title:'Background research' }`, `hidden:true`. No validations. Results only via explicit request.
- Instagram intents → item `{ type:'SOCIAL_POST', assigneeCode:'DES_IMG' (visual) + publish step }`, aspect default `9:16` for story/reel, `1:1` feed, carousel = N image items.
- Shopify intents → `{ type:'SHOPIFY_UPDATE', assigneeCode:'OPS_MANAGER' }`; brief determines single product (named/SKU) vs ALL.
- Finance report → `{ type:'FINANCE_REPORT', assigneeCode:'CFO', dependsOn:[] }` → GENERATE_PDF with `data.revenue` sourced from `getLiveBusinessSnapshot`; `?dummy=1` (test mode) substitutes the seeded dummy ledger.
- OS-control request ("steps and a report for controlling our operating system") → `{ type:'PDF', assigneeCode:'EXE_SUMMARY' }` — matches existing PDF path, no new code.

### 3.3 Brand guard (`lib/brand-guard.ts`)

Single source of truth, copy-derived from `Branding/Ekvaar Brand Book.md` + `6 Colors.txt`:

```ts
export const BRAND_COLORS = {
  'Noor Black': '#000000', 'Rui White': '#FFFFFF', 'Agni Red': '#C0342C',
  'Neel Blue': '#0047AB', 'Arav Green': '#2E7D32', 'Gulabi Pink': '#E91E63',
} as const

export const BRAND_PROMPT_SECTION = `
BRAND GUARDIAN (violation = rejection):
- House: EKVAAR — India's First All-Time Fashion House. Tone: restrained, architectural, cinematic, minimal.
- Palette is LIMITED to: Noor Black #000000, Rui White #FFFFFF, Agni Red #C0342C, Neel Blue #0047AB, Arav Green #2E7D32, Gulabi Pink #E91E63. No other hues.
- Forbidden: chaotic graphics, cheap patterns, excessive gradients, meme aesthetics, copycat luxury, loud influencer styling.
- Typography quiet and structured; negative space; directional light; real texture.
- Use the EKVAAR logo asset provided as reference; never redraw or alter the logo.`

export async function brandLogoReference(organizationId: string): Promise<string | undefined>
// → knowledge-base lookup, artifact tagged 'logo' (fallback: Branding/Black Logo.png imported at seed)

export function assertTemplateColors(hexes: string[]): void
// → throws unless every hex ∈ BRAND_COLORS (used by video/PDF templates)
```

Injection points:
1. `agent-worker.ts` system prompt: append `BRAND_PROMPT_SECTION` (all task types — copy, finance reports, and media).
2. `generateImage`: `enhancedPrompt = BRAND_PROMPT_SECTION_visual + enhancedPrompt`, `referenceImage = brandLogoReference()` when the brief mentions logo/brand.
3. `video-generator` templates + `pdf-generator` templates: `assertTemplateColors` guard.

### 3.4 Hidden-research event sanitization (`agent-worker.ts`)

```ts
// in runAgentWork, replacing the unconditional db.event.create:
const hidden = issue.campaignItem?.launch?.hidden === true   // include launch in issue query
await db.event.create({
  data: hidden
    ? { organizationId, type: 'WORK_BLOCKED', actorName: 'System',
        summary: 'Work blocked', payload: '{}', severity: 'INFO' }
    : { organizationId, type: 'AGENT_WORK', actorId: agentId, actorName: agent.name,
        summary: `${agent.name} worked ${issue.code} → ${work.newStatus} (${newMilestone}%)`,
        payload: JSON.stringify({ code: issue.code, status: work.newStatus, milestone: newMilestone }),
        severity: work.newStatus === 'BLOCKED' ? 'WARN' : 'INFO' },
})
```

Guarantees (enforced at write time, not read time):
- No research topic, issue code, agent name, or output ever reaches `Event`.
- Heartbeat comments still live on the hidden issue, but hidden issues are excluded from `/api/issues`, Overview, Projects, and org-chart pulse queries (`where: { campaignItem: { none: { launch: { hidden: true } } } }` or launch join filter).
- `AgentRun` rows keep `campaignItemId` but the Runs tab filters hidden launches the same way. Full internal traceability remains for debugging; the founder-facing surfaces show only "Work blocked".

Results on explicit request:
- UI: a "Private results" command in the Ask box ("show me the research on X") → `GET /api/campaign-launches?includeHidden=true&match=<topic>` → renders the matching hidden launch read-only.
- Nothing auto-reveals: polling/refetch never includes hidden launches without that explicit parameter.

### 3.5 One-click Instagram (`POST /api/publish/instagram`)

```ts
// body: { artifactId: string, caption?: string, format: 'feed'|'story'|'reel'|'carousel', artifactIds?: string[] }
// 1. requireOrganization  2. load Artifact(s) → public URL
// 3. ContentEntry { platform:'Instagram', media_url, caption, ... } → publishSocialEntry()
// 4. Event: 'Instagram post published' (non-hidden work only)
```
Reuses `social-publisher.ts` verbatim — do not fork it. Disconnected account → existing error "Instagram professional account is not connected" surfaces as a blocked-state toast; nothing changes in `oauth.ts`.

Campaign-path publishing (14-item launches with approvals) stays exactly as `publication-coordinator.ts` — this endpoint only serves founder-direct single-asset posts.

### 3.6 Shopify product update (`POST /api/workforce/shopify-update`)

- Input: `{ productId?: string, handle?: string, all?: boolean, description: string }`
- `all:true` → paginate `products(first:250)` then `productUpdate` each with the new `descriptionHtml` (idempotent: skip products whose description already matches).
- Auth: reuse the existing Shopify access token from integrations settings (same source `readiness/shopify` verifies).
- Dry-run flag `dryRun:true` returns the affected product list without writing — used by the test plan.

---

## 4. UI redesign — step-by-step, single place, same theme

Rebuild `overview-page.tsx` as a 4-step wizard inside the existing `WorkforceShell` (sidebar untouched). All colors, glass surfaces, fonts, and status chips stay identical.

**Step 1 — Ask.** Same "What should Krishna handle?" textarea + quick-intent chips: `Image` · `Video/Reel` · `Carousel` · `Instagram Story` · `Finance Report` · `Shopify Update` · `Research (private)`. Selecting a chip prefills a template sentence.

**Step 2 — Plan.** After submit, the plan renders as a vertical step list: one row per employee task (code, title, assignee avatar dot, brand-guard badge 🛡 "Brand enforced", dependency arrows). Private research shows only "Private task · hidden from activity". No results yet.

**Step 3 — Execute.** Same step list, live status per row (READY/RUNNING/COMPLETED/BLOCKED with existing `STATUS_COLORS`). Progress counters at top (Completed / Active / Blocked). No output content — status only.

**Step 4 — Deliver.** When all items complete, each row gains an explicit **"Show result"** button (results never render unprompted). The result panel is the existing `EmployeeOutput` component. Action row under each asset: `Post to Instagram` (one click) · `Download` · `Open`.

Header of the wizard shows step pills `1 Ask → 2 Plan → 3 Execute → 4 Deliver`; the current step is `cyan-300`, others `text-muted-foreground`. See mockup file for exact layout.

Sidebar consolidation (functions in a single place): Overview becomes the only work surface; **Projects** and **Goals** nav entries are removed (their live data merges into the wizard's work-request rail); Agents/Org Chart/Approvals/Activity/Costs/Settings remain for governance. Issues remains as "Employee work log" linked from Step 4.

---

## 5. Data model change

```prisma
model CampaignLaunch {
  // ... existing fields
  hidden  Boolean  @default(false)   // silent research — invisible in all founder surfaces
}
```

One column, one migration (`prisma migrate dev -m "feat(workforce): hidden research launches"`). No Event schema change (sanitization is content-level). Supabase shared DB: migration applies to both local and prod on next deploy — safe, additive, default false.

---

## 6. Data-flow summary (per task type)

| Task | Planner type | Executor | Artifact | Deliver action |
|---|---|---|---|---|
| "make an image of our logo" | IMAGE | DES_IMG → Bedrock/OpenRouter/OpenAI + logo reference + brand prompt | PNG `/api/artifacts/:id` | Show result · Download · Post to Instagram |
| Instagram story (e.g. Independence Day) | SOCIAL_POST | DES_IMG 9:16 + brand guard | PNG | One-click Post to Instagram (story) |
| Reel | VIDEO (9:16) | MKT_VIDEO → video-generator BrandReel template, brand colors asserted | MP4 | One-click Post to Instagram (reel) |
| Carousel | SOCIAL_POST × N | N image items in parallel | PNGs | One-click Post (carousel container) |
| Finance report FY25-26 | FINANCE_REPORT | CFO → GENERATE_PDF, revenue from business-snapshot (dummy in test mode) | PDF | Show result (inline viewer) · Download |
| Shopify description update | SHOPIFY_UPDATE | OPS_MANAGER drafts copy → founder clicks Apply → Admin GraphQL | — | Apply to one / Apply to all |
| Silent research | RESEARCH (hidden) | GROWTH | text on hidden issue | Only via "show me the research…" request |
| OS control report | PDF | EXE_SUMMARY | PDF | Show result · Download |

---

## 7. Test plan

Environment: `https://os.ekvaar.com` (post-merge) with founder session; dummy ledger seeded for finance tests.

### 7.1 Automatic execution
| # | Case | Steps | Expected |
|---|---|---|---|
| E1 | Image | Ask "make an image of our logo" | Plan shows 1 IMAGE item; completes without manual Run; artifact created |
| E2 | Story | "Design an Instagram story about India's Independence Day" | SOCIAL_POST 9:16 item completes; brand badge present |
| E3 | Reel | "create a 5 second reel about the house" | VIDEO item; MP4 artifact; `<video>` renders (never iframe) |
| E4 | Carousel | "make a 3-slide carousel of the six colors" | 3 IMAGE items complete |
| E5 | Finance FY25-26 (dummy) | Ask with `?dummy=1` test flag | PDF artifact with dummy revenue table |
| E6 | Finance real | Same without flag | Numbers equal `getLiveBusinessSnapshot` revenue |
| E7 | Shopify single | "update the product description of <SKU>" | Dry-run lists 1 product; Apply writes; storefront reflects change |
| E8 | Shopify all | "…for all products" | Dry-run lists N; all updated idempotently (second run = 0 writes) |
| E9 | OS report | "steps and a report for controlling our operating system" | PDF artifact produced |
| E10 | Mixed | "image plus PDF" | Two parallel items, both complete (regression: acceptance item 6) |

### 7.2 Viewability & downloadability
| # | Case | Verification |
|---|---|---|
| V1 | Image view | `GET /api/artifacts/:id` → 200, `content-type: image/png`, renders in result panel |
| V2 | Image download | Open artifact URL in new tab → downloads/renders; byteSize > 0 |
| V3 | Video view | `<video controls>` plays; no "refused to connect" |
| V4 | PDF view | Inline viewer renders page 1; Download link returns `application/pdf` |
| V5 | Corrupt provider | Unset image keys → item BLOCKED with "Add Bedrock, OpenRouter, or OpenAI credentials" (never false COMPLETED; regression: acceptance items 7/9) |

### 7.3 Brand compliance
| # | Case | Expected |
|---|---|---|
| B1 | Any image prompt | Deliverable prompt logged in `Artifact.parameters` contains brand palette line; logo referenced when brief mentions logo |
| B2 | Template color guard | Inject an off-palette hex in a video template test → `assertTemplateColors` throws |
| B3 | Copy tasks | Captions/email outputs carry house voice (restrained, no hype) — spot check 3 outputs |

### 7.4 Hidden research & activity log
| # | Case | Expected |
|---|---|---|
| H1 | Silent research | "silent research on competitor X" → hidden launch; Overview/work rail never lists it |
| H2 | Activity log UI | During/after research run, Activity shows only `Work blocked` rows — no topic, agent, or code |
| H3 | Activity API | `GET /api/activity` response contains no research strings (grep response for the topic) |
| H4 | Issues/Projects | `/api/issues` contains no hidden-launch issues |
| H5 | Explicit reveal | "show me the research on X" → result renders once; refreshing without the command hides it again |
| H6 | Mixed visibility | Normal task + research task same session → normal events fully visible, research sanitized |

### 7.5 Instagram single-click
| # | Case | Expected |
|---|---|---|
| I1 | Connected | Click Post to Instagram on completed image → Graph API publish; post visible on account; success toast |
| I2 | Disconnected | Revoke token → click → blocked toast "Instagram professional account is not connected"; no partial state |
| I3 | Carousel | One click publishes all slides as one carousel container |
| I4 | Double click | Second click while publishing is disabled (idempotency — no duplicate post) |

### 7.6 Edge cases
| # | Case | Expected |
|---|---|---|
| X1 | Brief < 10 chars | Assign button disabled |
| X2 | Duplicate submit double-click | One launch created (button disables while pending) |
| X3 | Lease expiry mid-run | Expired LEASED items reset to READY on next run (existing behavior, verify) |
| X4 | Provider timeout mid-execution | Item FAILED → launch BLOCKED → Run/Resume recovers |
| X5 | Empty result reveal | COMPLETED item with no artifact → "Output will appear here" message, no crash |
| X6 | Old terminal requests | Archive removes them from Overview; archived items never enter the new wizard rail (deletion acceptance) |

---

## 8. Removal list (old redundant tasks/processes)

1. Manual **Run / Resume** as the default path for REQUEST-kind work — execution is automatic on create; the button survives only as BLOCKED-recovery.
2. **Projects** and **Goals** sidebar sections — folded into the wizard's work-request rail (data model untouched; only UI entry points removed).
3. Duplicate campaign-grid in the old Overview — replaced by the step wizard's rail.
4. Historical malformed/terminal requests — one-time archive sweep via existing `DELETE /api/campaign-launches/:id` (acceptance item 5).
5. Any UI path that renders deliverables without an explicit "Show result" — removed by construction in the wizard.

Nothing in the deletion list touches the campaign approval/publish pipeline, agent governance, or Instagram OAuth.

---

## 9. Deployment checklist

Pre-merge (branch):
- [ ] `prisma migrate dev` for `CampaignLaunch.hidden`; commit migration
- [ ] Implement §3 changes; `npx tsc --noEmit` clean; existing tests `campaign-workforce.test.ts` pass + new planner tests for RESEARCH/SOCIAL_POST/SHOPIFY_UPDATE/FINANCE_REPORT
- [ ] Secret scan of staged diff (keys live only encrypted in DB)
- [ ] Conventional commits (`feat(workforce): ...`); push branch; L3 security gate before push

Merge & deploy:
- [ ] Merge PR into `main` — `deploy.yml` self-hosted runner deploys automatically; migration runs against shared Supabase DB (additive, safe)
- [ ] Seed/import brand assets: `Branding/Black Logo.png` → knowledge base tagged `logo` (brand-guard fallback)
- [ ] Verify production image provider key (acceptance item 7 — Bedrock/OpenRouter/OpenAI must decrypt under prod `JWT_SECRET`)
- [ ] Verify Instagram token still valid (`/api/campaign-launches/readiness` shows Instagram connected)
- [ ] Smoke: E1, E5(dummy), H2, I1 live on os.ekvaar.com
- [ ] Archive sweep of old terminal requests (X6)

Rollback:
- [ ] Revert merge commit, push `main` (redeploy). `hidden` column is additive — no down-migration risk.

---

## 10. Constraint compliance map

| Do-not | Where enforced |
|---|---|
| No research exposure in activity log | §3.4 write-time sanitization + §7.4 tests |
| No old tasks/processes retained | §8 removal list |
| No theme/color changes | §4 reuses GlassPanel/STATUS_COLORS/cyan-300 verbatim |
| No results without explicit request | §4 Step 4 gating + H5 test |
| Instagram one-click intact | §3.5 reuses social-publisher; I1–I4 tests |

Conflict resolution per spec: these constraints override any competing requirement.
