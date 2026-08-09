# Approved Plan: Ekvaar Autonomous Campaign Workforce

## Decision

**APPROVED FOR IMPLEMENTATION.**

Phases 0-3 can be built immediately. Provider activation and production publishing remain release-gated until Shopify, Meta, Instagram, Supabase Storage, and Qikink readiness checks pass with the organization's real credentials.

This is a native Ekvaar implementation on Next.js, Prisma/PostgreSQL, BullMQ/Redis, FastAPI where needed, and Supabase Storage. Do not fork or deploy the Gas Town Go/tmux/Dolt runtime.

## Product Contract

The Founder gives Krishna one outcome in natural language. Krishna creates the campaign, decomposes it into dependent work, delegates to the 65-person digital workforce, monitors progress, retries recoverable failures, assembles evidence, applies the organization's approval policy, and reports the verified result.

The system must never display synthetic progress. A task is complete only when its required artifact, validation, or provider receipt exists.

Provider commits are performed only by the deterministic Publication Coordinator. LLM employees may prepare drafts and recommendations but cannot call live publish, spend, theme-publish, or destructive endpoints directly.

## Identity Model

- **Founder:** the authenticated Ekvaar `User` for the organization. Do not hardcode a person's name or user ID.
- **Krishna:** the existing digital employee with `code=CEO`, renamed from Arjun to Krishna. Krishna is both the CEO employee and the Founder-facing command interface. This preserves the roster count at 65; no separate Mayor employee is created.
- **Employees:** the remaining 64 records from `agent-roster.ts`, with their existing hierarchy, directives, and skills.
- **System services:** Publication Coordinator, Outbox Dispatcher, scheduler, and validation gates. They are not employee records and use `assigneeType=SYSTEM` when they own a launch item.

High-risk approval is always performed by the authenticated human Founder. Krishna may recommend approval but cannot impersonate the Founder.

## Phase 0: Existing Schema Preflight

The current `Agent.code @unique` global constraint conflicts with the claim that every organization receives its own 65-person roster. Before adding campaign tables:

1. Remove the global `@unique` from `Agent.code` and retain `@@unique([organizationId, code])`.
2. Change `AgentPattern` and `AgentKnowledge` relations from `agentCode -> Agent.code` to composite relations: `[organizationId, agentCode] -> Agent.[organizationId, code]`.
3. Run a migration test that seeds the complete roster into two organizations and verifies both receive all 65 employees.
4. Rename the `CEO` roster employee from Arjun to Krishna in the canonical roster and organization seed/update path.
5. Preserve existing production agents and data; use an idempotent migration/upsert, not destructive reseeding.

## Native Architecture

### Command plane

Krishna chat parses the Founder prompt into a structured `CreateCampaignCommand`. The command service creates the campaign, its work items, dependencies, Issues, and an outbox event in one database transaction.

### Execution plane

Each employee-owned `CampaignLaunchItem` links to an existing `Issue`. The existing Issue/AgentRun/BullMQ worker loop remains the execution runtime. Every employee execution creates an `AgentRun` linked directly to its campaign item for observability.

### Validation plane

Validators never write evidence onto another employee's leased item. Each brand, originality, compliance, tracking, inventory, margin, and technical check creates or updates its own `CampaignValidation` record.

### Commit plane

The Publication Coordinator reads an approved frozen revision, verifies all hashes and prerequisites, executes provider actions in dependency order, and records durable idempotency and provider receipts.

### Storage plane

Generated images, videos, PDFs, reports, and browser proofs are stored in private Supabase Storage buckets and represented by the existing `Artifact` model. Extend `Artifact` with `contentHash String?` and `byteSize Int?`; do not create a parallel asset registry. `storageLocation` uses `supabase://bucket/object-path` and UI access uses short-lived signed URLs.

## Data Model

Use Prisma enums for campaign, item, validation, publication, approval-mode, outbox, and assignee states. API boundaries must validate all JSON payloads with the repository's existing validation pattern.

### `CampaignLaunch`

Required fields:

- `id`, `organizationId`, `code`, `title`, `brief`
- `status`, `priority`, `budgetCap Decimal?`
- timestamps and rollback metadata
- relations to Organization, items, revisions, validations, and approvals
- `@@unique([organizationId, code])`
- indexes on `[organizationId, status]`

### `CampaignRevision`

Required fields:

- `launchId`, `revisionNum`, `versionHash`, `evidenceJson`
- `status`: PREPARED, APPROVED, REJECTED, REVOKED
- `publishStatus`: INELIGIBLE, READY, PUBLISHING, PUBLISHED, PARTIALLY_PUBLISHED, BLOCKED
- `approvalMode`: NONE, AUTO, FOUNDER
- `approvedByUserId String?`, with an optional relation to `User`
- `approvedAt`, publish timestamps
- `previousThemeId`, `themeRevisionId`
- relations to launch, validations, approvals, and publish logs
- `@@unique([launchId, revisionNum])`

Never store the literal `"AUTO"` in a User foreign-key field. Auto-approval uses `approvalMode=AUTO` and leaves `approvedByUserId` null.

### `CampaignLaunchItem`

Required fields:

- `launchId`, `code`, `type`, `title`, `description`, `status`, `orderNum`
- `assigneeType`: AGENT or SYSTEM
- `assigneeId String?` for an Agent owner
- `serviceKey String?` for a system owner
- `issueId String? @unique` linking to the existing Issue work object
- provider draft/proof and evidence hash
- `leaseOwnerId`, `leaseExpiresAt`, `attemptCount`, `version`
- `executionKey String @unique` generated when the item is created
- relations to launch, Issue, assignee Agent, lease-owner Agent, dependencies, validations, runs, and optional publish logs
- `@@unique([launchId, code])`

Application validation enforces exactly one owner:

- `assigneeType=AGENT`: `assigneeId` required and `serviceKey` null.
- `assigneeType=SYSTEM`: `serviceKey` required and `assigneeId` null.

Add reverse relations to `Agent`, `Issue`, and `AgentRun`. Add nullable `campaignItemId` to `AgentRun` with an index.

### `CampaignLaunchDependency`

Fields: `id`, `itemId`, `dependsOnId`.

Relations use explicit names to the dependent and prerequisite `CampaignLaunchItem`. Do not duplicate `launchId` in this table. The dependency creation service loads both items inside a serializable transaction and rejects different `launchId` values, self-dependencies, duplicates, and cycles.

Use `@@unique([itemId, dependsOnId])` and indexes on both columns.

### `CampaignValidation`

Required fields:

- `launchId`, optional `revisionId`, optional `itemId`
- `scopeKey`: `launch` or `item:<item-code>`
- `domain`: BRAND, ORIGINALITY, MARGIN, TRACKING, COMPLIANCE, INVENTORY, TECHNICAL, DEVICE
- `validatorAgentId`
- `status`: PENDING, RUNNING, PASS, FAIL, BLOCKED
- `evidenceHash`, `evidenceJson`, timestamps
- relations to launch, revision, item, and validator Agent
- `@@unique([launchId, scopeKey, domain])`

Only PASS validations are included in a frozen revision. A change to an artifact or validation creates a new revision; it never mutates an approved revision.

### `CampaignPublishLog`

Required fields:

- `revisionId`, optional `itemId`
- `provider`, `action`, `idempotencyKey String @unique`
- `providerId`, `proofHash`, sanitized provider response
- `status`: PENDING, RUNNING, CONFIRMED, FAILED, BLOCKED, ROLLED_BACK
- retries, errors, timestamps

The launch is derived through `CampaignRevision`; do not duplicate `launchId` and risk mismatched relations.

### `OutboxMessage`

Required fields:

- `organizationId` with a relation to Organization
- aggregate type/id/version and event type
- `deduplicationKey String @unique`
- JSON payload
- status: PENDING, PROCESSING, DISPATCHED, PROCESSED, FAILED
- lease token/expiry, attempts, next retry, errors, timestamps

Add Organization reverse relations for campaigns, campaign policy, and outbox messages.

### `CampaignPolicy`

One row per organization:

- `organizationId @unique` with Organization relation
- `autoApproveLimit Decimal`
- `autoApproveEnabled`
- `requireFirstApproval`
- risk flags and configurable inventory/SKU thresholds

### Existing model changes

- `Approval`: add nullable `launchId`, `revisionId`, `itemCode`, `proofHash`, and `policyDecision`, with explicit relations.
- `Artifact`: add nullable `contentHash` and `byteSize`.
- `User`: add reverse relation for manually approved campaign revisions.
- `Agent`: add assigned-item, leased-item, validation, and campaign-run reverse relations.
- `Issue`: add optional reverse relation to one campaign item.
- `AgentRun`: add optional `campaignItemId` relation.
- `Workflow` and `WorkflowTask`: leave unchanged. Add only a normal documentation comment that new campaign flows use CampaignLaunch. Do not ignore or delete them.

## Fourteen-Item Fashion Week DAG

| Code | Item | Owner | Depends on |
|---|---|---|---|
| CL-1-01 | Strategy brief | GROWTH / Rohan | - |
| CL-1-02 | Offer design | GRW_OFFER / Reva | 01 |
| CL-1-03 | Margin validation | FIN_PRICING / Sia | 02 |
| CL-1-04 | Design research and originality preparation | DES_INCLUSIVE / Diya | 01 |
| CL-1-05 | Image generation | DES_IMG / Aisha | 04 |
| CL-1-06 | Story and visual narrative | DES_STORY / Kabir | 04 |
| CL-1-07 | Brand check | DES_BRAND / Noor | 05, 06 |
| CL-1-08 | Copy and content plan | MKT_CONTENT / Sara | 01 |
| CL-1-09 | Instagram plan | MKT_IG / Myra | 08 |
| CL-1-10 | Reel concept | MKT_VIDEO / Naina | 08 |
| CL-1-11 | Meta Ads draft | GRW_PAIDSOCIAL / Tanvi | 08, 09, 10 |
| CL-1-12 | Ad creative concepts | GRW_ADCREATIVE / Vihaan | 05, 11 |
| CL-1-13 | Shopify discount draft | SYSTEM / COMMERCE_PREPARER | 02, 03 |
| CL-1-14 | Frozen Founder packet | EXE_SUMMARY / Aarohi | 01-13 and all required validations PASS |

Required validations before CL-1-14 may complete:

- Ojas: TRACKING PASS for CL-1-11
- Ishita: COMPLIANCE PASS for the launch
- Rhea: INVENTORY PASS for CL-1-13
- Noor: BRAND PASS for generated assets
- Diya: ORIGINALITY PASS for generated assets
- Sia: MARGIN PASS for CL-1-03
- Meera: TECHNICAL PASS for asset links and theme safety
- Ishan: DEVICE PASS for campaign previews

These are independent `CampaignValidation` records, not shared item mutations.

## Approval Policy

Manual Founder approval is required when any of these apply:

- first campaign for the organization
- budget exceeds the organization's limit
- first use of a provider or newly changed credentials
- first video/reel workflow without validated generation history
- theme publication
- inventory/SKU change exceeds policy threshold
- compliance, originality, margin, tracking, inventory, technical, or device validation is missing or not PASS
- any dependency is BLOCKED

Routine campaigns may auto-approve only when the organization enables it, all evidence hashes match, the revision hash matches, every required validation is PASS, and no risk flag is present.

## Transactional Outbox and Idempotency

The database transaction writes the business state change and a PENDING outbox message together. Delivery is **at least once**, not exactly once.

Dispatcher claim algorithm:

1. In a short PostgreSQL transaction, select eligible PENDING messages using `FOR UPDATE SKIP LOCKED` with a limit.
2. Mark selected rows PROCESSING with a lease token and expiry, then commit.
3. Enqueue each BullMQ job using the outbox deduplication key as the stable job ID.
4. Mark the message DISPATCHED after enqueue succeeds.
5. The BullMQ worker marks the message PROCESSED only after the durable business effect is recorded.
6. Expired PROCESSING leases return to PENDING. Stale DISPATCHED messages are reconciled with BullMQ and safely re-enqueued when absent.

BullMQ job IDs are an optimization, not the correctness boundary. Every publication action first claims a unique `CampaignPublishLog.idempotencyKey`. If a prior CONFIRMED result exists, return it. If the provider supports idempotency keys, pass one. If the process crashes after an ambiguous provider response, reconcile by reading provider state before retrying; when reconciliation is impossible, mark BLOCKED for human review instead of repeating the write.

## Publication Order and Failure Policy

1. Shopify discount activation
2. Meta campaign activation, after discount CONFIRMED and inventory PASS
3. Instagram feed, after Meta and discount CONFIRMED
4. Instagram story, after feed CONFIRMED
5. Instagram reel, after feed CONFIRMED and video evidence PASS

Failure behavior:

- Shopify failure blocks Meta and Instagram.
- Meta failure blocks Instagram; an already-live discount remains live unless the Founder chooses compensation.
- Feed failure blocks story and reel.
- Partial success sets PARTIALLY_PUBLISHED and creates a Founder alert. No automatic destructive rollback.
- Theme changes always use duplicate, preview, QA, approval, publish, and stored previous-theme rollback.

## Qikink Contract

Qikink remains proof-gated browser automation through the existing `ProductLaunch` lifecycle. It is not represented as a deterministic API adapter.

- Use a local signed-in browser companion for login-dependent steps.
- Login, CAPTCHA, missing selector, or changed UI sets BLOCKED with screenshots and a precise reason.
- Never claim completion without `qikinkProductId`, browser proof, and the resulting `shopifyProductId` where applicable.
- Never copy a personal browser profile to the production worker.

## Native Workforce UX

Replace the generic workforce pages with an Ekvaar-native control center using the supplied Gas Town/Kilo UX specification:

- persistent sidebar and route-based workspace
- Krishna CEO chat beside the live company overview
- campaigns/convoys, Issues/beads, employee roster, approvals, live feed, costs, observability, and settings
- stackable detail drawers
- list, Kanban, and dependency graph views
- live updates through SSE plus bounded polling fallback
- actual image/video/audio/PDF previews and downloads from Artifact records
- explicit BLOCKED reasons, validation evidence, provider receipts, retries, and costs

No terminal shell is exposed publicly. No UI action can execute arbitrary host commands.

## Provider Readiness Gates

Each provider must pass before production activation:

1. authenticated account identity check
2. read test against real resources
3. non-publishing write or draft test where supported
4. webhook/reconciliation test
5. idempotency/retry test
6. sanitized proof stored in ToolExecution and Artifact

Required adapters:

- Shopify Admin API: inventory, discount draft/activate, product metadata, theme duplicate/preview/publish/rollback
- Meta Graph/Marketing API: draft campaign, audience, creative, activation, status reconciliation
- Instagram Graph API: feed, story, reel publishing and reconciliation
- Supabase Storage: private upload, signed read, hash verification, deletion policy
- Qikink: local browser companion with proof gates

## Implementation Phases

### Phase 0: multi-tenant roster and migration safety

Fix Agent uniqueness and composite learning relations, rename CEO to Krishna idempotently, seed two-org test, and back up production before migration.

### Phase 1: campaign foundation

Add campaign models and enums, explicit reverse relations, state machine, CRUD API, organization policy, Artifact extensions, Issue/AgentRun bridge, and outbox dispatcher.

### Phase 2: employee execution

Add employee capability manifests, activation rules, Issue creation, work leasing, AgentRun linkage, concurrency limits, event subscriptions, and validation records.

### Phase 3: autonomous command and UX

Connect Krishna prompts to campaign commands, build the 14-item DAG, frozen revision packet, policy decision service, Founder Inbox approval, and the native control-center UI behind `CAMPAIGN_LAUNCHES_ENABLED=false`.

### Phase 4: provider adapters

Build and readiness-test Shopify, Meta, Instagram, Supabase Storage, and the local Qikink browser companion. This phase blocks production publishing, not development of Phases 0-3.

### Phase 5: deterministic publishing

Complete Publication Coordinator, durable idempotency, dependency blocking, provider reconciliation, theme safety, partial-publication handling, and rollback commands.

### Phase 6: post-launch operations and pilot

Add orders, inventory, spend, customer, and compliance monitors. Enable for one pilot organization, run one real low-risk campaign, verify receipts, then widen access.

## Acceptance Gates

1. **Schema and migration:** `prisma format`, `prisma validate`, migration on a production-shaped database copy, and rollback rehearsal pass.
2. **Tenant isolation:** two organizations can each hold the same 65 agent codes and same campaign code without cross-org reads or assignments.
3. **DAG integrity:** all 14 items are created; cross-launch edges, cycles, and self-dependencies are rejected.
4. **Lease recovery:** duplicate workers cannot own one item; expired leases recover; AgentRun and Issue remain linked.
5. **Evidence lock:** missing validation prevents packet creation; changing any artifact or validation invalidates the revision and requires a new hash.
6. **Approval policy:** safe campaigns auto-approve only within organization policy; high-risk campaigns require the authenticated Founder.
7. **Outbox crash recovery:** crashes before enqueue, after enqueue, and after provider response produce no lost work and no repeated confirmed provider action.
8. **Publication safety:** Shopify/Meta/Instagram dependencies block correctly; partial publication is visible and proof-backed.
9. **Asset delivery:** images render as images, video/audio play, PDFs/reports download, hashes match, and no campaign asset is stored on EC2 disk.
10. **Qikink proof:** browser completion requires Qikink and Shopify identifiers plus screenshots; login/CAPTCHA/UI drift produces BLOCKED.
11. **End-to-end autonomy:** one Founder prompt creates the campaign and completes every policy-allowed step without manual card movement or simulated output.

## Approval

This plan is approved for implementation. The first pull request must contain only Phase 0 and Phase 1 foundation work, with the feature flag off and no live provider writes.
