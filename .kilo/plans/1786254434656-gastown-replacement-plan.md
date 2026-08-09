# Final Plan: Ekvaar Campaign Launch System

## Goal
Replace the generic AI workforce with a domain-specific Campaign Launch system on Ekvaar's Next.js + Prisma + BullMQ stack. 65 real employees from `agent-roster.ts` execute real business workflows through real provider integrations (Shopify Admin API, Meta Graph API, Instagram Graph API). A deterministic Publication Coordinator service handles provider commits. Human Founder approval gates high-risk publishes; organization-scoped policy governs routine operations.

---

## 1. Data Model (Final — All Relations Valid)

### Add: `CampaignLaunch`

```prisma
model CampaignLaunch {
  id             String       @id @default(cuid())
  organizationId String
  code           String
  title          String
  brief          String
  status         String       @default("DRAFT")
  priority       String       @default("MEDIUM")
  budgetCap      Decimal?     @db.Decimal(12, 2)
  startedAt      DateTime?
  completedAt    DateTime?
  rolledBackAt   DateTime?
  rollbackReason String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization            @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          CampaignLaunchItem[]
  revisions      CampaignRevision[]
  publishLogs    CampaignPublishLog[]
  dependencies   CampaignLaunchDependency[]
  approvals      Approval[]

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([status])
}
```

**Fix:** `code` uses `@@unique([organizationId, code])` for multi-tenancy. `budgetCap` uses `Decimal` not `Float`.

### Add: `CampaignRevision`

```prisma
model CampaignRevision {
  id                String   @id @default(cuid())
  launchId          String
  revisionNum       Int
  versionHash       String   // SHA-256 of all frozen evidence JSON
  evidenceJson      String   // Complete frozen packet (compressed)
  status            String   @default("PREPARED") // PREPARED | APPROVED | REJECTED | REVOKED
  approvedAt        DateTime?
  approvedBy        String?  // Human Founder user ID (UUID), or "AUTO" for auto-approved
  publishStatus     String   @default("INELIGIBLE") // INELIGIBLE | READY | PUBLISHING | PUBLISHED | PARTIALLY_PUBLISHED | BLOCKED
  publishStartedAt  DateTime?
  publishCompletedAt DateTime?
  previousThemeId   String?  // Shopify theme ID to restore on rollback
  themeRevisionId   String?  // Shopify preview theme ID that was published

  launch      CampaignLaunch        @relation(fields: [launchId], references: [id], onDelete: Cascade)
  approvals   Approval[]
  publishLogs CampaignPublishLog[]   @relation("RevisionPublishLogs")

  @@unique([launchId, revisionNum])
  @@index([launchId, status])
  @@index([launchId, publishStatus])
}
```

**Fix:** `previousThemeId` added. `approvedBy` is human Founder user ID. `publishStatus` transitions: `INELIGIBLE` → `READY` (on APPROVED) → `PUBLISHING` (coordinator starts) → `PUBLISHED`/`PARTIALLY_PUBLISHED`/`BLOCKED` (completion).

### Add: `CampaignLaunchItem`

```prisma
model CampaignLaunchItem {
  id            String     @id @default(cuid())
  launchId      String
  code          String
  type          String
  title         String
  description   String?
  status        String     @default("PENDING")
  assigneeId    String?    // FK to Agent (employee executing)
  orderNum      Int
  providerDraft String?
  providerProof String?
  evidenceHash  String?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Work-leasing fields
  leaseOwnerId   String?    // FK to Agent currently leasing this item
  leaseExpiresAt DateTime?  // TTL; expired leases become available
  attemptCount   Int        @default(0)
  idempotencyKey String?    // deterministic dedup key for adapter calls
  version        Int        @default(1) // optimistic locking

  launch         CampaignLaunch           @relation(fields: [launchId], references: [id], onDelete: Cascade)
  assignee       Agent?                   @relation("AssignedItems", fields: [assigneeId], references: [id], onDelete: SetNull)
  leaseOwner     Agent?                   @relation("LeasedItems", fields: [leaseOwnerId], references: [id], onDelete: SetNull)
  dependencies   CampaignLaunchDependency[] @relation("DependentItems")
  dependedBy     CampaignLaunchDependency[] @relation("PrerequisiteItems")
  publishLogs    CampaignPublishLog[]

  @@unique([launchId, code])
  @@index([launchId, status])
  @@index([launchId, assigneeId])
  @@index([leaseOwnerId])
  @@index([leaseExpiresAt])
}
```

**Note:** `Agent` model must add two reverse relations: `AssignedItems CampaignLaunchItem[] @relation("AssignedItems")` and `LeasedItems CampaignLaunchItem[] @relation("LeasedItems")`. These are added alongside existing `issuesAssigned`/`runs` relations.

### Add: `CampaignLaunchDependency`

```prisma
model CampaignLaunchDependency {
  id          String @id @default(cuid())
  launchId    String
  itemId      String   // the item that depends
  dependsOnId String   // the prerequisite item

  launch      CampaignLaunch    @relation(fields: [launchId], references: [id], onDelete: Cascade)
  item        CampaignLaunchItem @relation("DependentItems", fields: [itemId], references: [id], onDelete: Cascade)
  dependsOn   CampaignLaunchItem @relation("PrerequisiteItems", fields: [dependsOnId], references: [id], onDelete: Cascade)

  @@unique([launchId, itemId, dependsOnId])
  @@index([launchId, dependsOnId])
  @@index([launchId, itemId])
}
```

**Fix:** `CampaignLaunch` now has `CampaignLaunchDependency[]` as `dependencies` reverse relation. `item` and `dependsOn` use the same relation names as `CampaignLaunchItem.dependencies` and `dependedBy`.

### Add: `CampaignPublishLog`

```prisma
model CampaignPublishLog {
  id              String   @id @default(cuid())
  launchId        String
  revisionId      String
  itemId          String?
  provider        String
  action          String
  idempotencyKey  String   @unique
  providerId      String?
  proofHash       String?
  status          String   @default("PENDING")
  retryCount      Int      @default(0)
  maxRetries      Int      @default(3)
  errorMessage    String?
  providerResponse String?
  createdAt       DateTime @default(now())
  completedAt     DateTime?

  launch   CampaignLaunch     @relation(fields: [launchId], references: [id], onDelete: Cascade)
  revision CampaignRevision   @relation("RevisionPublishLogs", fields: [revisionId], references: [id], onDelete: Cascade)
  item     CampaignLaunchItem? @relation(fields: [itemId], references: [id], onDelete: SetNull)

  @@index([launchId, provider])
  @@index([revisionId])
  @@index([status])
}
```

**Fix:** `idempotencyKey` is required and `@unique` — prevents duplicate publish log entries. Removed nullable `providerId` from unique constraint. Added `itemId` relation back to `CampaignLaunchItem`.

### Add: `OutboxMessage`

```prisma
model OutboxMessage {
  id              String   @id @default(cuid())
  organizationId  String
  aggregateType   String   // CampaignLaunch | CampaignLaunchItem | CampaignRevision | Approval
  aggregateId     String
  eventType       String   // CAMPAIGN_ITEM_PREPARED | REVISION_APPROVED | etc.
  deduplicationKey String  // deterministic: sha256(eventType + aggregateId + version)
  payload         String   // JSON
  dispatchStatus  String   @default("PENDING") // PENDING | PROCESSING | DISPATCHED | FAILED | PROCESSED
  leaseToken      String?  // consumer that leased this message (for at-least-once recovery)
  leaseExpiresAt  DateTime?
  attemptCount    Int      @default(0)
  lastError       String?
  nextRetryAt     DateTime? // exponential backoff
  processedAt     DateTime? // set when consumer confirms processing complete
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  version         Int      @default(1) // optimistic locking

  @@unique([deduplicationKey])
  @@index([organizationId, dispatchStatus])
  @@index([dispatchStatus, leaseExpiresAt])
  @@index([aggregateType, aggregateId])
}
```

**Fix:** Added `deduplicationKey` (required, `@unique`), `leaseToken`, `leaseExpiresAt`, `attemptCount`, `nextRetryAt`, `processedAt`, `version`. At-least-once consumer pattern: dispatcher leases messages (`dispatchStatus=PROCESSING` + `leaseToken`), processes, marks `PROCESSED`. Stale recovery: messages with `dispatchStatus=PROCESSING` and `leaseExpiresAt < now()` are re-leased by any consumer.

### Add: `CampaignPolicy` (organization-scoped)

```prisma
model CampaignPolicy {
  id                  String   @id @default(cuid())
  organizationId      String
  autoApproveLimit    Decimal  @db.Decimal(12, 2) @default(5000.00)
  requireFirstApproval Boolean @default(true) // first-ever campaign always requires Founder approval
  autoApproveEnabled  Boolean  @default(true)
  riskFlags           String   @default("[]") // JSON array: ["new_provider", "large_inventory_change", "no_prior_video"]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId])
}
```

**Fix:** Replaces global `SystemSetting.autoApproveLimit` with per-organization `CampaignPolicy`. Each org has its own threshold and risk flags. `Organization` model must add `campaignPolicies CampaignPolicy[]` relation (one-to-one via `@@unique([organizationId])`).

### Modify: `Approval`

Add: `launchId` (String?), `revisionId` (String?), `itemCode` (String?), `proofHash` (String?), `policyDecision` (String?) — all nullable. Add bidirectional relations:

```prisma
  launch    CampaignLaunch?    @relation(fields: [launchId], references: [id], onDelete: SetNull)
  revision  CampaignRevision?   @relation(fields: [revisionId], references: [id], onDelete: SetNull)
```

**Note:** Approval already has bidirectional relation with Agent via `requesterId`. New relations are optional and SetNull on delete.

### Leave: `Workflow` / `WorkflowTask` Intact

**Fix:** Do NOT add `@@ignore` or `@deprecated`. Leave models unchanged. Add a comment above each: `// DEPRECATED: Use CampaignLaunch + CampaignRevision for all new campaign workflows. Workflow/WorkflowTask retained for historical Issue linkage. Do not create new workflows from this model.`

### Add: `AssetStoragePath`

```prisma
model AssetStoragePath {
  id           String   @id @default(cuid())
  organizationId String
  bucket       String   // campaign-assets | brand-assets | qikink-proofs
  objectPath   String   // e.g. "campaigns/CL-1/feed-image-001.png"
  mediaType    String
  byteSize     Int
  contentHash  String
  createdAt    DateTime @default(now())

  @@unique([organizationId, bucket, objectPath])
  @@index([organizationId, bucket])
}
```

All generated images/videos stored in Supabase Storage.

---

## 2. Reuse Boundary

| Existing Model | Reused By | How |
|----------------|-----------|-----|
| `Organization` | `CampaignLaunch` | `organizationId` FK |
| `Agent` | `CampaignLaunchItem.assignee` / `leaseOwner` | FK relations |
| `AgentRun` | `CampaignLaunchItem` | Each item execution creates an AgentRun for audit trail |
| `Event` | All lifecycle | `type: "CAMPAIGN_LAUNCH_CREATED"`, `"CAMPAIGN_ITEM_PREPARED"`, etc. |
| `Approval` | `CampaignRevision` | Founder approval records reference revision |
| `ProductLaunch` | Qikink product proof | Qikink products use existing proof-gated lifecycle |
| `OAuthToken` | Adapter layer | Shopify/Meta/Instagram tokens |
| `Artifact` | Generated assets | `storageLocation: supabase://...` URIs |
| `BrandCheck` | DES_BRAND validation | Reusable brand QA evidence |
| `Integration` | Provider connections | Shopify/Meta/Instagram connections |
| `ToolExecution` | Adapter calls | All API calls logged |
| `User` | `approvedBy` field | Human Founder user ID for approvals |
| `CampaignPolicy` | Campaign auto-approval | Organization-scoped policy |

**DO NOT reuse:** `Workflow`/`WorkflowTask` (deprecated, left intact). `Issue` is for product/engineering tickets only.

---

## 3. Sixty-Five Roster: Activation Classes

Every employee belongs to exactly ONE class. (See Section 2 of previous version for full 65-row table — unchanged and correct.)

**Class Counts:** CAMPAIGN_CORE (21), PLATFORM_ENGINEERING (11), CONTINUOUS_OPERATIONS (13), GOVERNANCE_OVERSIGHT (12), ON_DEMAND_SPECIALIST (8). Total = 65.

---

## 4. Krishna Identity and Command Interface (Final)

**Fix:** Krishna IS the CEO-level command interface. Not "Mayor." Not a separate entity.

### Role Mapping
| Entity | Role | Description |
|--------|------|-------------|
| **Krishna** | CEO-level command interface | Natural-language orchestrator. Interprets Founder prompts, creates campaign records, delegates to employees, assembles packets, presents approvals. Does NOT execute provider writes or bypass gates. |
| **Arjun** | Human Founder | The actual person issuing commands to Krishna. Reviews frozen revision packets in Founder Inbox. Approves/rejects high-risk publishes. Manages rollback decisions. `approvedBy = Arjun's user.id`. |
| **Employees** | Campaign executors | 65 real employees from `agent-roster.ts` that prepare drafts, proofs, and assets. |

### Command Flow
1. Founder says to Krishna: "Launch Fashion Week campaign with 20% off."
2. Krishna parses intent → creates `CampaignLaunch` (DRAFT) → creates 14 `CampaignLaunchItem` records with DAG dependencies → emits outbox events.
3. Employees execute via existing `Issue` work loop — each item creates an `Issue` assigned to the relevant employee.
4. EXE_SUMMARY assembles frozen `CampaignRevision` with `versionHash`.
5. Krishna evaluates approval policy via `CampaignPolicy`:
   - If budget ≤ threshold AND policy allows auto-approve → `CampaignRevision.status=APPROVED`, `approvedBy="AUTO"`, `publishStatus="READY"`.
   - If budget > threshold OR first-ever campaign OR risk flags present → `CampaignRevision.status=PREPARED`, `publishStatus="INELIGIBLE"`. Krishna presents packet in Founder Inbox for Arjun's manual approval.
6. Arjun approves → `CampaignRevision.status=APPROVED`, `approvedBy=Arjun.userId`, `publishStatus="READY"` → outbox event → Publication Coordinator.

**Krishna's hard limits:** Cannot call provider commit endpoints. Cannot bypass approval gates. Cannot modify frozen `versionHash`. Cannot publish without approval (manual or policy-approved). Cannot delete production data.

---

## 5. Approval Policy (Organization-Scoped)

### Auto-Approval Decision Tree
```
IF CampaignPolicy.autoApproveEnabled = true
AND CampaignPolicy.requireFirstApproval = false (or not first campaign)
AND campaign.budgetCap <= CampaignPolicy.autoApproveLimit
AND no risk flags triggered (qikink login, new provider, no prior video, large inventory change)
AND all evidence hashes valid
AND versionHash matches
AND no BLOCKED dependencies
THEN auto-approve: CampaignRevision.status = APPROVED, approvedBy = "AUTO", publishStatus = "READY"
ELSE: CampaignRevision.status = PREPARED, publishStatus = "INELIGIBLE" — requires Arjun manual approval
```

### Risk Flags (Config in CampaignPolicy.riskFlags)
| Flag | Trigger | Auto-approve? |
|------|---------|---------------|
| `new_provider` | First campaign using Shopify/Meta/Instagram | NO |
| `large_inventory_change` | Discount affects 100+ SKUs | NO |
| `no_prior_video` | Reel content, no video generation history | NO |
| `theme_publish` | First theme publish for org | NO |

---

## 6. Fashion Week: 14 DAG Items (Defined)

**Fix:** Define all 14 items with dependencies and employee assignments.

| Code | Item | Type | Employee | Depends On |
|------|------|------|----------|------------|
| CL-1-01 | Strategy Brief | STRATEGY | GROWTH (Rohan) | — |
| CL-1-02 | Offer Design | OFFER | GRW_OFFER (Reva) | CL-1-01 |
| CL-1-03 | Margin Validation | PRICING | FIN_PRICING (Sia) | CL-1-02 |
| CL-1-04 | Design Research + Originality | CREATIVE_RESEARCH | DES_INCLUSIVE (Diya) | CL-1-01 |
| CL-1-05 | Image Generation | IMAGE_GEN | DES_IMG (Aisha) | CL-1-04 |
| CL-1-06 | Story/Visual Narrative | STORY | DES_STORY (Kabir) | CL-1-04 |
| CL-1-07 | Brand Check | BRAND_QA | DES_BRAND (Noor) | CL-1-05, CL-1-06 |
| CL-1-08 | Copy + Content Plan | COPY | MKT_CONTENT (Sara) | CL-1-01 |
| CL-1-09 | Instagram Plan | SOCIAL_PLAN | MKT_IG (Myra) | CL-1-08 |
| CL-1-10 | Reel Concept | REEL_CONCEPT | MKT_VIDEO (Naina) | CL-1-08 |
| CL-1-11 | Meta Ads Draft | META_DRAFT | GRW_PAIDSOCIAL (Tanvi) | CL-1-08, CL-1-09, CL-1-10 |
| CL-1-12 | Ad Creative Concepts | AD_CREATIVE | GRW_ADCREATIVE (Vihaan) | CL-1-05, CL-1-11 |
| CL-1-13 | Shopify Discount Draft | COMMERCE_DRAFT | COMMERCE_OPS (Krishna service) | CL-1-02, CL-1-03 |
| CL-1-14 | Founder Inbox Packet | PACKET | EXE_SUMMARY (Aarohi) | ALL of CL-1-01 through CL-1-13 |

**Pre-publish prerequisites (run before CL-1-14 → APPROVED):**
- GRW_TRACKING (Ojas) validates tracking setup (UTM pixels, CAPI) → proof stored on CL-1-11
- LEG_COMPLIANCE (Ishita) validates compliance + privacy → proof stored on CL-1-14
- OPS_MANAGER (Rhea) validates inventory + ops readiness → proof stored on CL-1-13
- ENG_REVIEW (Meera) validates technical QA (theme safety, asset links, device preview) → proof stored on CL-1-14
- ENG_FE (Ishan) validates UI/device QA → proof stored on CL-1-14

**Fix:** Ojas, Ishita, and Rhea are pre-publish prerequisites, not just post-launch monitors. Their validation must pass before the packet is assembled.

---

## 7. State Machine (Corrected Transitions)

### CampaignRevision States
| State | Meaning | Transition To |
|-------|---------|----------------|
| PREPARED | All items + prerequisites complete, hash computed | APPROVED (auto or manual) |
| APPROVED | Hash locked, publish authorized | (entering publish flow — `publishStatus` becomes `READY`) |
| REJECTED | Arjun rejected | PREPARED (after fixes, new revision) |
| REVOKED | Superseded by newer revision | (terminal) |

**Fix:** `status` is the approval lifecycle. `publishStatus` is the publishing lifecycle. APPROVED → publishStatus becomes READY → PUBLISHING → PUBLISHED/PARTIALLY_PUBLISHED/BLOCKED. No circular dependency: approval sets `status=APPROVED` + `publishStatus=READY`.

### CampaignLaunch States
| State | Meaning | Terminal? |
|-------|---------|-----------|
| DRAFT | Created, brief entered | No |
| PREPARING | Items executing | No |
| PREPARED | Revision frozen, awaiting approval | No |
| APPROVED | Revision approved, ready to publish | No |
| PUBLISHING | Publication Coordinator executing | No |
| LIVE | All provider receipts reconciled | Yes |
| PARTIALLY_PUBLISHED | Some providers confirmed, others failed | No |
| BLOCKED | External blocker | No |
| ROLLED_BACK | Published work rolled back | Yes |
| CANCELLED | Abandoned | Yes |

### Publication Order (Dependency-Aware)
1. Shopify Discount Activate (foundation)
2. Meta Ads Activate (depends on discount CONFIRMED + inventory > 0)
3. Instagram Feed (depends on discount CONFIRMED + Meta ad ready)
4. Instagram Story (depends on feed CONFIRMED)
5. Instagram Reel (depends on feed CONFIRMED)

---

## 8. Transactional Outbox (At-Least-Once with Idempotency)

**Fix:** Correct at-least-once consumer pattern.

### Consumer Logic
```
DISPATCHER LOOP (runs every 5s):
  1. Claim stale leases: UPDATE OutboxMessage SET dispatchStatus='PENDING' 
     WHERE dispatchStatus='PROCESSING' AND leaseExpiresAt < NOW()
  2. Claim fresh batch: UPDATE OutboxMessage SET dispatchStatus='PROCESSING', 
     leaseToken=<this-instance>, leaseExpiresAt=NOW()+30s 
     WHERE dispatchStatus='PENDING' AND (nextRetryAt IS NULL OR nextRetryAt <= NOW())
     ORDER BY createdAt ASC LIMIT 50
  3. For each claimed message:
     - Parse payload → determine BullMQ job type
     - Enqueue BullMQ job with idempotencyKey = message.deduplicationKey
     - On success: UPDATE dispatchStatus='PROCESSED', processedAt=NOW(), attemptCount++
     - On failure: UPDATE attemptCount++, nextRetryAt=NOW()+backoff, 
       lastError=<msg>, dispatchStatus='PENDING' (for retry)
     - Release lease on completion
```

### Recovery Guarantees
- **Crash before PROCESSED:** Message remains PROCESSING, lease expires, another consumer re-claims. BullMQ job has `idempotencyKey` so no duplicate execution.
- **Crash after PROCESSED:** Message stays PROCESSED. Consumer reads BullMQ completion to determine if work was done.
- **Duplicate detection:** `deduplicationKey` unique constraint prevents duplicate outbox entries. Same `eventType + aggregateId + version` cannot be inserted twice.

---

## 9. Publication Safety and Rollback

### Dependency-Aware Blocking
| Failure | Response |
|---------|----------|
| Shopify discount fails to activate | Meta ads, Instagram feed/story/reel → all BLOCKED. Founder notified. |
| Meta ads fail after 3 retries | Instagram feed/story/reel → BLOCKED. Discount stays LIVE. |
| Instagram feed fails | Story/reel → BLOCKED. |
| Partial publish succeeds | Status=PARTIALLY_PUBLISHED. No auto-rollback. Founder confirms. |

### Shopify Theme Safety
1. Duplicate live theme → development theme
2. Apply changes to development theme
3. Generate preview URL
4. Run automated QA (links, images, mobile, discount code visibility, no broken scripts)
5. Founder approval (or auto-approved if within policy threshold)
6. Publish development theme → live. Store previous theme ID in `CampaignRevision.previousThemeId`.
7. Rollback: publish `previousThemeId` from `CampaignRevision` (<30 seconds)

---

## 10. Integration Contracts

### Qikink Browser Automation (Proof-Gated)

Qikink is browser automation, NOT a deterministic provider adapter. Stays proof-gated with explicit failure modes (login, CAPTCHA, UI change → BLOCKED + human gate). Reuses existing `ProductLaunch` model and `qikinkProductId` field.

### Shopify Admin API
| Action | Adapter | Proof Required |
|--------|---------|----------------|
| Create discount (draft) | `shopify_discount_create_draft` | Draft ID, code, URL, API hash |
| Activate discount | `shopify_discount_activate` | `shopifyDiscountId`, response hash, timestamp |
| Theme duplicate | `shopify_theme_duplicate` | Duplicate theme ID, preview URL |
| Theme publish | `shopify_theme_publish` | New live theme ID, previous theme ID stored, response hash |
| Inventory read | `shopify_inventory_levels` | SKU + quantity JSON |

### Meta Graph API
| Action | Adapter | Proof Required |
|--------|---------|----------------|
| Campaign draft | `meta_campaign_create_draft` | Draft campaign ID, ad set draft ID |
| Campaign activate | `meta_campaign_activate` | `metaCampaignId`, status=ACTIVE, response hash |

### Instagram Graph API
| Action | Adapter | Proof Required |
|--------|---------|----------------|
| Publish feed | `instagram_media_publish` | `instagramMediaId`, permalink |
| Publish story | `instagram_story_publish` | `instagramStoryId`, expires_at |
| Publish reel | `instagram_reel_publish` | `instagramReelId`, permalink |

---

## 11. Capability Gaps

| Employee | Skill | Status | Action Required |
|----------|-------|--------|-----------------|
| ENG_BE | Shopify Admin API adapter | Not built | Build + manifest addition |
| ENG_BE | Meta Graph API adapter | Not built | Build + manifest addition |
| ENG_BE | Instagram Graph API adapter | Not built | Build + manifest addition |
| ENG_BE | Supabase Storage client | Not built | Build (reuse `@supabase/supabase-js`) |
| DES_IMG | Video generation | No skills | Requires video generation adapter or human gate for Reel |
| MKT_TIKTOK | TikTok adapter | Not built | Only needed if founder requests TikTok |
| GRW_PAIDSOCIAL | Meta Ad creation | Skills present | Requires Meta Graph adapter |
| MKT_IG | Instagram publishing | Skills present | Requires Instagram Graph adapter |

**Readiness gate:** Plan is NOT implementation-ready until Phase 4 adapters pass connectivity/readiness tests.

---

## 12. Phased Implementation

### Phase 1: Foundation
- Add all 6 new models to `schema.prisma` with valid bidirectional relations.
- Add nullable fields to `Approval`.
- Add `CampaignPolicy` model.
- Add deprecation comments to `Workflow`/`WorkflowTask` (leave intact).
- Build `/api/campaign-launches` CRUD.
- Build `campaign-launch.ts` state machine.
- Build `outbox-dispatcher.ts` (at-least-once consumer).
- Build `publication-coordinator.ts` skeleton.
- Build `campaign-policy.ts` service (auto-approval evaluation).

### Phase 2: Employee Manifest + Work Leasing
- Add `EmployeeCapabilityManifest` model.
- Implement event subscription engine.
- Implement work leasing with TTL, retry, idempotency, optimistic locking.
- Build pre-publish prerequisite validation engine (Ojas, Ishita, Rhea, Meera, Ishan).

### Phase 3: Fashion Week DAG + Approval
- Build DAG builder with 14 items + dependency edges.
- Build Founder Inbox packet generator with SHA-256 hash.
- Build approval gate with CampaignPolicy auto-approval.
- Feature flag: `CAMPAIGN_LAUNCHES_ENABLED` (off).

### Phase 4: Adapter Layer (Critical Path)
- ENG_BE builds Shopify, Meta, Instagram, Supabase Storage adapters.
- All adapters pass connectivity test.

### Phase 5: Publishing Track
- Deterministic Publication Coordinator with dependency-aware ordering.
- Transactional outbox integration.
- Shopify theme safety + rollback.

### Phase 6: Post-Launch + Dogfood
- Monitoring, alerts, reconciliation.
- Pilot org test.
- Verify all 6 acceptance gates.

---

## 13. Six Acceptance Gates

**Gate 1 — Multi-Tenant DAG Integrity**
CampaignLaunch in org A succeeds. Same `code` in org B succeeds. Same `code` in same org fails. 14 DAG items with correct `CampaignLaunchDependency` edges. Cycles rejected. All items PREPARED → `CampaignRevision` created with `versionHash`.

**Gate 2 — Approval Hash Lock + Auto-Approval Policy**
- Low-budget (≤ CampaignPolicy.autoApproveLimit): auto-approved. Hash frozen. Publish succeeds.
- High-budget (> threshold): blocks on Arjun approval. Modify asset → new revision → hash mismatch → publish refused.
- First campaign: requires manual approval regardless of budget.

**Gate 3 — Shopify Theme Safety**
Theme update → duplicate → preview → QA → publish to live + store `previousThemeId` in `CampaignRevision`. Rollback restores in <30s.

**Gate 4 — Publication Failure and Partial Publish**
Shopify discount CONFIRMED. Meta fails after 3 retries → BLOCKED. `publishStatus=PARTIALLY_PUBLISHED`. No auto-rollback. Founder alerted. Founder triggers rollback.

**Gate 5 — Evidence-Based Completion + Work Leasing**
DES_IMG generates image. Item INCOMPLETE until DES_BRAND + DES_INCLUSIVE validate. Lease fields (`leaseOwnerId`, `leaseExpiresAt`, `version`) enforce optimistic concurrency. Pre-publish prerequisites (Ojas, Ishita, Rhea, Meera, Ishan) must all PASS before packet assembly.

**Gate 6 — Transactional Outbox No-Loss Guarantee**
Employee completes item → DB transaction commits item update + OutboxMessage. Dispatcher claims → enqueues BullMQ (idempotencyKey) → marks PROCESSED. Kill dispatcher → restart → stale leases reclaimed → no work lost or duplicated.

---

## 14. Open Questions (None Blocking)

All corrections from CTO rebuttal addressed:
- Prisma relations are bidirectional with explicit names, all valid
- `CampaignPublishLog.idempotencyKey` required + unique
- Outbox has dedup key, leasing, retry timing, at-least-once recovery
- Workflow/WorkflowTask left intact with comment (not `@ignore`)
- `assigneeId`/`leaseOwnerId` as Agent FK relations
- Organization-scoped `CampaignPolicy` (not global SystemSetting)
- `Decimal` for all money fields
- Revision state transitions: APPROVED sets `publishStatus=READY` (no circular dependency)
- Krishna = CEO-level command interface; Arjun = human Founder; `approvedBy` = Founder user ID
- Ojas/Ishita/Rhea = pre-publish prerequisites
- All 14 Fashion Week DAG items defined with dependencies
- `previousThemeId` on `CampaignRevision`
- Qikink spelling consistent throughout

Phases 1-3 are implementation-ready pending Phase 4 (provider adapters).
