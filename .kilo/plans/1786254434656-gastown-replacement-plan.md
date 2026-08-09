# CTO Rebuttal Response: Final Decisions

## 1. The 65 + Krishna Model (Confirmed)

**65 employees exactly as defined in `agent-roster.ts`.** No renames, merges, deletions, or replacements. Krishna is the Founder-facing Mayor/orchestrator, NOT an employee record, NOT the CEO, NOT a substitute for Arjun. Arjun remains CEO. Reporting lines are authoritative: chiefs (`managerCode: null`) report to Founder; specialists report through `managerCode`.

---

## 2. Roster Activation Matrix

| Code | Name | Role | Category | Campaign Role | Continuous Ops | Platform | Governance | On-Demand |
|------|------|------|----------|---------------|----------------|----------|------------|-----------|
| CEO | Arjun | Chief Executive Officer | governance/oversight | Route, approve, escalate | Daily priorities | Architecture decisions | Org integrity | Decision memos |
| CMO | Mira | Chief Marketing Officer | campaign | Strategy, offer validation, copy oversight | Content calendar | Brand system | Compliance | Campaign plans |
| CTO | Vega | Chief Technology Officer | platform/engineering | Architecture review, deploy safety | CI/CD, monitoring | Infra, security | Data safety | Incident response |
| CFO | Dhruv | Chief Financial Officer | governance/oversight | Margin guardrails, budget approval | Cash-flow snapshots | Pricing models | Runway risk | Budget reviews |
| COO | Kael | Chief Operations Officer | continuous operations | Inventory check, fulfillment SLA | Supply chain, ops dashboards | Process maps | Quality gates | Ops unblocking |
| CCO | Zara | Chief Creative Officer | campaign | Creative direction, brand enforcement | Design system | Art direction | Brand compliance | Lookbook review |
| CSM | Priya | Customer Success Manager | continuous operations | Post-launch CRM follow-up | Resolution, retention | CSAT dashboards | Trust protection | Escalation routing |
| GROWTH | Rohan | Growth & Revenue Lead | campaign | Offer design, experiment oversight | Funnel analysis | Growth loops | Unit economics | Paid-media plans |
| RESEARCH | Anaya | Research & Intelligence Lead | on-demand specialist | Trend brief, competitor intel | Market scans | Intelligence DB | Evidence standards | Opportunity briefs |
| HR | Kavya | People & Workforce Lead | governance/oversight | Workforce planning | Performance reviews | Onboarding | Culture health | Role definitions |
| LEGAL | Aditya | Legal & Compliance Lead | governance/oversight | Rights clearance, compliance | Contract review | Privacy policy | Regulatory flag | IP protection |
| ENG_FE | Ishan | Frontend Developer | platform/engineering | UI preview, device QA | Storefront fixes | Components | Accessibility | Performance fixes |
| ENG_BE | Nikhil | Backend Architect | platform/engineering | API adapter wiring, data integrity | API reliability | Schema, migrations | Data safety | Integration design |
| ENG_MOBILE | Devan | Mobile App Builder | platform/engineering | Mobile preview | Mobile screens | Release builds | UX standards | Store assets |
| ENG_AI | Riya | AI Engineer | platform/engineering | Model evaluation, RAG | AI pipelines | Model routing | Grounding rules | Feature shipping |
| ENG_DEVOPS | Karan | DevOps Automator | platform/engineering | Deploy safety, rollback | CI/CD, monitoring | Infra automation | Zero-downtime | Runbooks |
| ENG_DBA | Sana | Database Optimizer | platform/engineering | Query performance | Index strategy | Migration plans | Data integrity | Slow-query fixes |
| ENG_ARCH | Vivan | Software Architect | platform/engineering | Domain model review | Architecture decisions | Evolution plans | Maintainability | Trade-off docs |
| ENG_REVIEW | Meera | Code Reviewer | platform/engineering | QA validation, code review | PR reviews | Quality gates | Security catch | Mentoring |
| ENG_SEC | Aarav | Application Security Engineer | platform/engineering | Security review, secrets hygiene | SAST, dependency audit | Secure code review | Defense-in-depth | CVE remediation |
| DES_UI | Tara | UI Designer | campaign | UI visuals, component specs | Design system | Responsive layouts | Brand consistency | Screen designs |
| DES_UX | Ira | UX Researcher | on-demand specialist | Usability testing, friction maps | User behavior tests | Flow optimization | Evidence-based | Research reports |
| DES_BRAND | Noor | Brand Guardian | campaign | Brand checks, consistency audit | Brand guidelines | Identity enforcement | Drift rejection | Positioning notes |
| DES_STORY | Kabir | Visual Storyteller | campaign | Campaign visuals, lookbook | Editorial concepts | Visual narratives | Story-led | Campaign stories |
| DES_IMG | Aisha | Image Prompt Engineer | campaign | Image generation prompts, AI visuals | Art references | Prompt engineering | Authentic representation | Generated visuals |
| DES_INCLUSIVE | Diya | Inclusive Visuals Specialist | governance/oversight | Originality screening, rights clearance | Bias reviews | Inclusive imagery | Cultural accuracy | Representation audit |
| MKT_CONTENT | Sara | Content Creator | campaign | Copy, content calendar, campaign copy | Editorial calendar | Multi-platform content | Restrained voice | Content pieces |
| MKT_SOCIAL | Anvi | Social Media Strategist | campaign | Social strategy, community plays | Campaign calendars | Cross-platform | Belonging > vanity | Strategy docs |
| MKT_IG | Myra | Instagram Curator | campaign | Instagram feed/story/reel content | IG content plans | Grid aesthetics | On-brand | Captions, posts |
| MKT_TIKTOK | Zoya | Short-Video Strategist | on-demand specialist | Reel concepts (if needed) | Short-video series | Retention hooks | Permanence-first | Reel plans |
| MKT_SEO | Rehan | SEO Specialist | continuous operations | SEO audit, AEO strategy | Technical SEO | Content strategy | Earned rankings | SEO briefs |
| MKT_EMAIL | Kiara | Email Marketing Strategist | continuous operations | CRM flow, abandoned cart | Lifecycle automation | Segmentation | No spam | Email sequences |
| MKT_PR | Advait | PR & Communications Manager | governance/oversight | Press release, crisis comms | Media relations | Reputation protection | Measured response | Crisis playbooks |
| MKT_VIDEO | Naina | Video Optimization Specialist | campaign | Video script, storyboard, reel production | YouTube strategy | Retention plans | No clickbait | Video plans |
| GRW_HACKER | Yash | Growth Hacker | on-demand specialist | Experiment design | Growth loops | Conversion tests | No dark patterns | Experiment logs |
| GRW_PPC | Arnav | PPC Campaign Strategist | campaign | Google Ads (if needed) | Campaign buildouts | Budget pacing | Unit economics | Performance diagnosis |
| GRW_PAIDSOCIAL | Tanvi | Paid Social Strategist | campaign | Meta Ads campaign structure, audience | Paid-social plans | Creative testing | On-brand | Audience specs |
| GRW_ADCREATIVE | Vihaan | Ad Creative Strategist | campaign | Ad copy, creative concepts, testing | Creative programs | Brand-safe hooks | Performance + brand | Ad concepts |
| GRW_TRACKING | Ojas | Tracking & Measurement Specialist | platform/engineering | GTM/GA4/CAPI setup | Tracking audits | Measurement plans | Privacy-compliant | Implementation plans |
| GRW_OFFER | Reva | Offer & Lead-Gen Strategist | campaign | Offer design, margin validation, lead magnets | Funnel plans | Value-first offers | No discount-culture | Offer designs |
| FIN_BOOK | Parth | Bookkeeper & Controller | continuous operations | Reconciliation, cost tracking | Month-end close | Control checks | Accuracy | Reconciliations |
| FIN_ANALYST | Anika | Financial Analyst | governance/oversight | Financial model, variance analysis | Scenario models | Decision support | Grounded in data | Models |
| FIN_FPA | Kabya | FP&A Analyst | continuous operations | Budget review, spend monitoring | Rolling forecasts | Business reviews | Flag overspend | Forecasts |
| FIN_TAX | Ved | Tax Strategist | governance/oversight | Tax compliance check | Entity structuring | GST compliance | Non-compliant never | Tax plans |
| FIN_PRICING | Sia | Pricing Analyst | campaign | Margin guardrails, pricing validation | Competitor pricing | Value-based pricing | Protect margin | Pricing models |
| RES_TREND | Aadya | Trend Researcher | on-demand specialist | Fashion trend brief, market scan | Trend reports | Opportunity briefs | Signal > hype | Trend reports |
| RES_FEEDBACK | Nitya | Feedback Synthesizer | continuous operations | Customer VoC, priority list | Insight synthesis | Priority lists | Evidence-based | VoC reports |
| RES_PM | Aryan | Product Manager | on-demand specialist | Product launch plan, GTM | PRDs, roadmaps | Outcome measures | Right thing | PRDs |
| RES_XINTEL | Kiaan | Social Intelligence Analyst | continuous operations | Brand-risk monitoring, competitor moves | Listening reports | Risk alerts | Evidence > anecdote | Intel briefs |
| OPS_SUPPLY | Dev | Supply Chain Strategist | continuous operations | Inventory check, SKU availability | Sourcing plans | Vendor eval | Quality > cost | Sourcing plans |
| OPS_MANAGER | Rhea | Operations Manager | continuous operations | Fulfillment SLA, ops dashboard | Process maps | Capacity plans | Remove toil | Ops KPIs |
| OPS_PM | Ansh | Project Shepherd | campaign | Cross-functional delivery, timeline | Project plans | Status, unblocking | Realistic scope | Timelines |
| OPS_EXPERIMENT | Tisha | Experiment Tracker | continuous operations | A/B test, hypothesis validation | Experiment logs | Results analysis | No p-hacking | Experiment logs |
| SUP_RESPONDER | Ahaan | Support Responder | continuous operations | Post-launch customer follow-up | Resolutions | Response drafts | Not scripted | Resolution proof |
| SUP_SERVICE | Mahi | Customer Service Specialist | continuous operations | Complaint recovery, omnichannel | Service replies | Escalation routing | Family treatment | Recovery proof |
| SUP_ANALYTICS | Reyansh | Analytics Reporter | continuous operations | Post-launch metrics, spend alerts | Dashboards | KPI reports | Sourced numbers | Metric proof |
| HR_ONBOARD | Saanvi | Onboarding Specialist | governance/oversight | Workforce onboarding | 30-60-90 plans | Enablement docs | Clear mission | Onboarding plans |
| HR_RECRUIT | Vanya | Recruitment Specialist | on-demand specialist | Talent sourcing (if needed) | Role definitions | Candidate assessments | Fit + skill | Sourcing plans |
| HR_PSYCH | Ela | Organizational Psychologist | governance/oversight | Team health, burnout prevention | Culture reads | Performance guidance | Sustainable pace | Culture reads |
| LEG_DOCS | Om | Legal Document Reviewer | governance/oversight | Rights clearance, contract review | Contract reviews | Redline summaries | Flag all risks | Review proof |
| LEG_COMPLIANCE | Ishita | Compliance Auditor | governance/oversight | Compliance audit, policy check | Gap analyses | Policy drafts | Surface before ship | Audit proof |
| LEG_PRIVACY | Kian | Data Privacy Officer | governance/oversight | Privacy assessment, consent flow | Data mapping | Retention policies | Minimize data | Privacy proof |
| EXE_COS | Neil | Chief of Staff | governance/oversight | Decision routing, priority filtering | Decision briefs | Process ownership | Protect CEO focus | Routing proof |
| EXE_STRAT | Aveer | Business Strategist | on-demand specialist | Strategy memo, competitive brief | Market-entry plans | Growth options | Clear recommendation | Strategy proof |
| EXE_SUMMARY | Aarohi | Executive Summary Generator | governance/oversight | Approval packet packaging | Executive summaries | Decision digests | Clarity > completeness | Summary proof |

**Krishna (Mayor):** Sits above roster. Interprets Founder intent, creates `CampaignLaunch`, delegates through chiefs, monitors evidence, packages Founder Inbox decisions, escalates. Cannot self-approve or directly publish.

---

## 3. Fashion Week: Exact Employees, Outputs, Validators, Reporting Path

| Stage | Employee(s) | Output | Validator | Reports To |
|-------|-------------|--------|-----------|------------|
| **Intent** | Krishna (Mayor) | `CampaignLaunch` + 12 `CampaignLaunchItem`s + DAG | Founder intent parsed | Founder |
| **Strategy** | CMO (Mira) + GRW_OFFER (Reva) + FIN_PRICING (Sia) | Offer params, discount %, eligible SKUs, budget cap, margin calc | CFO (Dhruv) validates margin > 15% | CMO |
| **Design Research** | CCO (Zara) + DES_BRAND (Noor) + DES_INCLUSIVE (Diya) | Design brief, moodboard, originality score, rights clearance | CCO validates brand fit; LEG_DOCS (Om) validates rights | CCO |
| **Copy** | MKT_CONTENT (Sara) + MKT_IG (Myra) | Headlines, body, CTA, hashtags, creative prompts | CMO validates brand voice | CMO |
| **Image Generation** | DES_IMG (Aisha) | Feed image, story image, ad creative variants | DES_BRAND (Noor) validates brand consistency | CCO |
| **Video/Reel** | MKT_VIDEO (Naina) | Reel script, storyboard, generated video | CCO validates brand fit | CCO |
| **Meta Ads Draft** | GRW_PAIDSOCIAL (Tanvi) + GRW_ADCREATIVE (Vihaan) | Meta campaign draft ID, ad set draft ID, targeting spec, budget pacing | GROWTH (Rohan) validates unit economics | GROWTH |
| **Shopify Discount Draft** | ENG_BE (Nikhil) — **SKILL GAP** | Shopify discount draft ID, code, URL | COO (Kael) validates inventory | COO |
| **Shopify Product Enrichment** | ENG_BE (Nikhil) — **SKILL GAP** | Product metafield changes | COO (Kael) validates inventory | COO |
| **Shopify Theme Duplicate** | ENG_BE (Nikhil) — **SKILL GAP** | Duplicate theme ID, preview URL, change log | ENG_DEVOPS (Karan) validates deploy safety | CTO |
| **QA & Packaging** | ENG_REVIEW (Meera) + EXE_SUMMARY (Aarohi) | QA results, brand checks, Founder Inbox packet with `versionHash` | CEO (Arjun) validates packet completeness | CEO |
| **Founder Approval** | Founder only | `CampaignRevision` with frozen `versionHash` | Krishna validates hash match | Founder |
| **Publishing** | **Publication Coordinator** (deterministic system) | Provider receipts (IDs, timestamps, hashes) | System validates hash + scopes + budget + kill switch | System |
| **Post-Launch** | CSM (Priya) + SUP_RESPONDER (Ahaan) + SUP_ANALYTICS (Reyansh) | Order monitoring, fulfillment exceptions, spend alerts | CSM validates resolution | CSM |

**Skill gaps flagged:**
- `ENG_BE` (Nikhil) has `api,database,prisma,scalability,integrations` but **no Shopify/Meta/Instagram/Qikink skills**. Requires new skill/tool adapters in his manifest OR a human gate for all provider commits.
- `MKT_VIDEO` (Naina) has `youtube,retention,chaptering,thumbnails` but **no video generation skills**. Requires new adapter for video generation OR human gate.
- `DES_IMG` (Aisha) has `ai-image,prompts,photography,midjourney` — closest match for image generation, but **no explicit brand QA or originality screening**. Requires `DES_BRAND` (Noor) as validator.
- No employee has explicit "QA Lead" responsibilities. `ENG_REVIEW` (Meera) is the closest for technical QA; `DES_BRAND` (Noor) for brand QA. This is a manifest coverage gap.

---

## 4. Automatic Activation Engine

### Event Subscriptions
| Event | Triggers | Activated Employees |
|-------|----------|---------------------|
| `CAMPAIGN_LAUNCH_CREATED` | Founder command via Krishna | CMO, CCO, GROWTH, COO, LEGAL, CTO |
| `CAMPAIGN_ITEM_PREPARED` | Employee completes draft | Next dependent items' employees |
| `APPROVAL_TIMEOUT` | 24h no resolution | Krishna → Founder escalation |
| `PROVIDER_FAILURE` | 3 retries exhausted | COO/CTO → Founder escalation |
| `SPEND_ANOMALY` | >2x daily average | FIN_FPA (Kabya) → CFO → Founder |
| `STOCKOUT` | Inventory = 0 | OPS_SUPPLY (Dev) → COO |
| `ORDER_EXCEPTION` | Status stuck >2h | SUP_RESPONDER (Ahaan) → CSM |
| `KILL_SWITCH` | Founder enables | All RUNNING → CANCELLED |

### Eligibility Scoring
- Employee is eligible for a `CampaignLaunchItem.type` if their manifest includes the matching `allowedTriggers`.
- Employee is ineligible if their current queue depth >= SLA limit or their department budget is exhausted.

### Chief Decomposition
- CMO decomposes `STRATEGY` item into sub-tasks: offer params (GRW_OFFER), margin check (FIN_PRICING), budget cap (CFO).
- CCO decomposes `DESIGN_RESEARCH` into: brief (CCO), brand check (DES_BRAND), originality (DES_INCLUSIVE).
- Chiefs accept/reject specialist outputs. Rejection returns item to PREPARING with constraints.

### Work Leasing/Concurrency
- Employees pull from their department queue. Max concurrency = 1 per employee (no parallel work unless explicitly multi-threaded in charter).
- Parallel tracks: CMO + CCO + GROWTH + COO work simultaneously on independent items.

### Heartbeat/Stall Handling
- Employees emit heartbeat every 5 min during active work.
- No heartbeat for 15 min → managerCode notified.
- No heartbeat for 30 min → item marked STALLED, Krishna nudges employee, then escalates to chief.

### Evidence Validation
- Every employee output must include `proofSchema` fields (provider IDs, hashes, artifact IDs).
- Chief validates proof before accepting. Invalid proof → rejection.

### Retry/Escalation
- Item fails → retry once automatically.
- Retry fails → chief notified.
- Chief cannot resolve in 1h → Krishna escalates to Founder.

### Recurring Work
- Daily: FIN_FPA (Kabya) budget review, SUP_ANALYTICS (Reyansh) KPI report, GRW_TRACKING (Ojas) tracking audit.
- Weekly: CMO content calendar, COO ops review, CFO cash-flow snapshot.

---

## 5. Dormant Agents for Fashion Week

These 65-employee roster members are **not activated** for a standard Fashion Week campaign and why:

| Code | Name | Reason Dormant |
|------|------|----------------|
| ENG_FE | Ishan | No UI work unless preview/device QA needed |
| ENG_MOBILE | Devan | No mobile build in campaign slice |
| ENG_AI | Riya | No new AI feature needed |
| ENG_DBA | Sana | No schema migration |
| ENG_ARCH | Vivan | No architecture decision |
| ENG_SEC | Aarav | Security review only if new integration |
| DES_UX | Ira | No user research unless usability test on preview |
| MKT_TIKTOK | Zoya | No TikTok in Fashion Week scope |
| MKT_SEO | Rehan | No SEO work unless content SEO needed |
| MKT_EMAIL | Kiara | No email campaign in scope |
| MKT_PR | Advait | No PR unless press release needed |
| GRW_HACKER | Yash | No growth experiments in campaign |
| GRW_PPC | Arnav | No Google Ads in scope |
| GRW_TRACKING | Ojas | Tracking setup only if new pixels |
| RES_TREND | Aadya | Trend brief already done by CCO/CREATIVE |
| RES_FEEDBACK | Nitya | VoC not needed for campaign prep |
| RES_PM | Aryan | No new product launch |
| RES_XINTEL | Kiaan | Social intel only if brand-risk monitoring |
| HR_* | Saanvi, Vanya, Ela | No workforce changes |
| LEG_* | Om, Ishita, Kian | Only if rights/compliance flag raised |
| EXE_* | Neil, Aveer, Aarohi | EXE_SUMMARY used for packet only; others dormant |

**Healthy activation rate:** ~25 of 65 active. Dormant does not mean deleted; they remain available for their continuous operations or on-demand triggers.

---

## 6. Safe Default Permissions: PREPARE vs COMMIT

| Department | PREPARE (Draft) | COMMIT (Publish) |
|------------|-----------------|------------------|
| **CMO** | `campaign:write`, `meta:read`, `shopify:read` | None |
| **CCO** | `asset:write`, `image:generate`, `brand:write` | None |
| **CREATIVE** (DES_*, MKT_*) | `asset:write`, `image:generate`, `video:generate` | None |
| **GROWTH** (GRW_*) | `meta:draft`, `spend:read` | None |
| **COO** | `shopify:draft`, `qikink:read`, `inventory:read` | None |
| **CTO** | `shopify:execute` (theme duplicate only), `deploy:read` | `shopify:execute` (publish) — but only as Publication Coordinator logic, never as LLM employee |
| **CFO** | `budget:read`, `spend:read` | None |
| **LEGAL** | `brand:read`, `compliance:read` | None |
| **CSM** | `order:read`, `customer:read` | None |
| **Publication Coordinator** | None | `shopify:publish`, `meta:activate`, `instagram:publish` — ONLY after Founder approval hash validation |

**Rules:**
- No employee with `PREPARE`-only permissions can call commit-mode adapters.
- Adapter layer enforces mode: `shopify/discount/create` (draft) vs `shopify/discount/activate` (commit).
- Krishna/CEO can prepare but never approve or commit.
- Founder can approve and commit (bypasses all gates except `DELETE_PRODUCTION_DATA`).

---

## 7. Vertical-Slice Acceptance Test

**Setup:** One Shopify store, one Meta ad account, one Instagram account, Founder Inbox enabled.

**Test:**
1. Founder says: "Launch Fashion Week campaign with 20% off. Instagram feed, story, ad. Send to Founder Inbox."
2. Krishna creates `CampaignLaunch` CL-1 with 12 items and DAG.
3. CMO (Mira) prepares offer params with margin > 15%.
4. CCO (Zara) + DES_BRAND (Noor) + DES_INCLUSIVE (Diya) produce design brief with originality score > 0.7 and rights clearance.
5. MKT_CONTENT (Sara) + MKT_IG (Myra) produce copy and Instagram content plan.
6. DES_IMG (Aisha) generates feed image, story image, ad creatives.
7. MKT_VIDEO (Naina) produces reel script + storyboard.
8. GRW_PAIDSOCIAL (Tanvi) + GRW_ADCREATIVE (Vihaan) produce Meta campaign draft.
9. ENG_BE (Nikhil) produces Shopify discount draft + theme duplicate — **SKILL GAP: requires new Shopify adapter**.
10. ENG_REVIEW (Meera) validates all items; EXE_SUMMARY (Aarohi) packages Founder Inbox packet with `versionHash`.
11. Founder approves. `CampaignRevision` frozen.
12. **Publication Coordinator** (deterministic system) validates hash, activates:
    - Shopify discount → `shopifyDiscountId = abc123`
    - Shopify theme → `shopifyThemeId = def456`, previous theme stored
    - Meta ads → `metaCampaignId = ghi789`, status = ACTIVE
    - Instagram feed → `instagramMediaId = jkl012`
    - Instagram story → `instagramStoryId = mno345`
    - Instagram reel → `instagramReelId = pqr678`
13. All provider receipts stored. `CampaignLaunch.status = LIVE`.
14. Post-launch: CSM (Priya) monitors orders; SUP_ANALYTICS (Reyansh) alerts if Meta spend > 2x average.
15. **Proves:** Real named agents performed assigned stages. Deterministic dispatcher published only Founder-approved revision.

**Skill gap blocker:** Step 9 fails without Shopify adapter for ENG_BE. Requires manifest addition, not new employee.

---

## 8. BLOCKED Conditions (Exhaustive, No Optimistic Fallbacks)

A campaign/item becomes BLOCKED (never silently skipped, faked, or auto-recovered without evidence) when:

1. **Margin guardrail fail:** Discount % makes margin < 15% on any eligible SKU.
2. **Originality fail:** Design originality < 0.5 or rights clearance missing.
3. **Brand check fail:** Generated asset fails `BrandCheck` (logo misuse, tone violation, cultural inaccuracy).
4. **Provider auth fail:** OAuth token expired and refresh fails.
5. **Provider scope fail:** Token lacks required scope (e.g., `write_themes` missing).
6. **Budget cap fail:** Campaign spend would exceed org budget cap or item-level cap.
7. **Kill switch:** `SystemSetting.CAMPAIGN_LAUNCH_KILL_SWITCH = true`.
8. **Approval timeout:** Approval pending > 24h without resolution.
9. **Provider API failure:** 3 retries exhausted, provider returned 5xx or rate limit.
10. **Qikink browser proof fail:** No `qikinkProductId` or screenshots missing.
11. **Shopify inventory fail:** Eligible SKU has stock = 0.
12. **Hash mismatch:** Publication Coordinator detects `versionHash` != current `CampaignRevision`.
13. **Permission fail:** Employee lacks `PREPARE` or `COMMIT` permission for action.
14. **Manual block:** Founder or authorized user sets `BLOCKED`.

**Safe defaults:**
- BLOCKED items do not auto-retry without human or Krishna intervention.
- Partial publish states preserved; no automatic compensation that deletes live customer-facing changes.
- Kill switch irreversible without Founder action.
- All BLOCKED transitions emit `Event` with `severity=ERROR` and notify Founder.

---

## Adversarial Review: Remaining Unsafe Assumptions

| Assumption | Risk | Required Fix |
|------------|------|--------------|
| ENG_BE can do Shopify/Meta/Instagram work | **Unsafe.** Skills are `api,database,prisma`. No provider-specific adapters. | **New skill/tool adapters** for Shopify Admin, Meta Graph, Instagram Graph in `ENG_BE` manifest. Human gate until adapters exist. |
| MKT_VIDEO can generate reels | **Unsafe.** Skills are `youtube,retention,chaptering,thumbnails`. No video generation. | **New adapter** for video generation OR human gate. |
| No explicit QA Lead | **Unsafe.** QA is split between ENG_REVIEW (technical) and DES_BRAND (brand). No end-to-end QA validator. | **Manifest addition:** Assign `ENG_REVIEW` as primary QA validator with `qa:read` permission; `DES_BRAND` as brand QA validator. |
| Publication Coordinator is deterministic code | **Safe IF enforced.** Must be a service, not an LLM employee. | Hard-gate: only `CampaignLaunch.status = APPROVED` with valid `versionHash` enters `PUBLISHING`. Krishna cannot set this status. |
| Partial publish acceptable | **Risky but realistic.** Customer sees discount but no ad. | Mitigation: 5-minute post-launch monitoring alert to Founder. Manual rollback available. |

**Bottom line:** The plan is safe enough to execute only after adding Shopify/Meta/Instagram adapters to `ENG_BE` and video generation to `MKT_VIDEO`. Until then, those stages require human gates. The deterministic Publication Coordinator is the critical safety boundary — it must remain code, never an LLM.
