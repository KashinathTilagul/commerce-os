# Plan: Replace AI Workforce with Gastown (Gas Town) Architecture

## Goal
Replace Ekvaar OS's current "Digital Workforce" with Gastown concepts, logic, UI/UX, and architecture while preserving the existing Prisma data layer.

## Current → Gastown Mapping

| Gastown | Current Ekvaar | Notes |
|---------|----------------|-------|
| **Town** | Organization + DigitalEmployeesHub | Multi-tenant org boundary |
| **Bead** | Issue | Atomic work unit — status, priority, assignee |
| **Rig** | Agent | Execution unit — identity, status, budget, skills |
| **Convoy** | AgentRun + AgentRunStep | Multi-bead DAG execution session |
| **Mayor** | Founder/CEO + Krishna chat | Conversational coordinator |
| **Polecat** | Approval + Action Policy Registry | Governance/approval gate |
| **Refinery** | AgentPattern + AgentLearning | Code review + learning loop |
| **Sling** | Issue creation + assignment | Assign work to rigs |

## Architecture Plan

### Layer 1: Data (Keep Prisma, add Gastown fields)
- Keep all existing models (`Agent`, `Issue`, `Approval`, `AgentRun`, etc.)
- Add Gastown concept mappings as lightweight views/labels:
  - `Issue` gets `beadId` (computed from `code` or new field)
  - `Agent` gets `rigId` and `role` (polecat/crew/mayor/deacon/witness)
  - `AgentRun` gets `convoyId` (nullable, groups related runs)
- No schema migration needed if we use computed fields or new nullable columns

### Layer 2: Backend Execution (Refactor agent-worker.ts)
- Keep BullMQ queue + worker
- Rename concepts in code:
  - `runAgentWork` → `processBead`
  - `delegateToSpecialists` → `convoyDecompose`
  - `IssueComment` kinds remain but map to bead events
- Add Convoy orchestrator:
  - New `convoy.ts` module that creates DAGs from bead dependencies
  - Executes beads in dependency order via BullMQ
  - Tracks convoy-level progress

### Layer 3: Mayor (Replace Krishna chat for workforce)
- Extend existing `jarvis/chat` route OR create new `/api/mayor` route
- Mayor tools ( Gastown has 37+ ):
  - `gt_sling` — create bead
  - `gt_convoy_status` — check progress
  - `gt_bead_reassign` — reassign work
  - `gt_nudge` — send real-time nudge to rig
  - `gt_agent_reset` — force-reset agent
  - `gt_list_agents` / `gt_list_beads` — status queries
- Mayor persists conversation per town (organization)

### Layer 4: UI (Rebuild workforce modules)
Replace `modules/workforce/*` with Gastown-style dashboard:

**New pages:**
1. **Town Home** (`digital-employees-hub.tsx` → `TownHome`)
   - Split-pane: Mayor chat (left) + dashboard widgets (right)
   - Health strip, throughput gauges, active agents

2. **Beads** (`issues-page.tsx` → `BeadsPage`)
   - Three views: List / Kanban / Graph
   - Kanban: Open / In Progress / In Review / Done columns
   - Bead cards with priority stripe, assignee, status
   - Detail drawer slides in from right

3. **Convoys** (`projects-page.tsx` → `ConvoysPage`)
   - Card grid + SVG timeline toggle
   - Progress bars, bead status, dependency DAG
   - Staged convoys (planned but not started)

4. **Rigs** (`agents/agent-list.tsx` → `RigsPage`)
   - Agent roster grid with role badges (mayor/polecat/crew/deacon/witness)
   - Status indicators, current bead, terminal link
   - Detail view: Dashboard / Instructions / Skills / Config / Runs / Budget

5. **Refinery** (new)
   - Code review queue for agent-generated work
   - Approval gates with ALLOW/REQUIRE_APPROVAL/DENY
   - Merge strategy settings

6. **Mayor Chat** (new component)
   - Collapsible right-side panel in town home
   - Persistent conversation
   - Tool-calling interface (37+ tools)

7. **Terminal Bar** (new)
   - Fixed bottom panel with Status / Mayor / Agent tabs
   - xterm.js integration for live agent sessions
   - Collapsible, drag-to-resize

### Layer 5: Styling
- Dark theme matching Gastown palette:
  - `--color-surface: #0a0a0a`
  - `--color-card: #141414`
  - `--color-accent: #3b82f6`
  - Status colors: amber=open, blue=in_progress, emerald=closed, red=blocked
- Typography: Inter + JetBrains Mono
- Animations: Framer Motion for transitions
- Layout: shadcn/ui + Radix primitives

## Migration Path

### Phase 1: Concept Rename (No UI change)
- Add `beadId`, `rigId`, `convoyId` computed fields
- Update API routes to accept both old and new terminology
- Update agent-worker.ts naming

### Phase 2: Mayor Chat
- Build Mayor component + API route
- Implement 5-10 core tools first (sling, status, assign, nudge)
- Wire into existing Krishna chat as "Mayor mode"

### Phase 3: Beads UI
- Replace issues Kanban with Gastown Beads page
- Add List/Kanban/Graph views
- Build bead detail drawer

### Phase 4: Convoys
- Build Convoy page (cards + timeline)
- Add convoy orchestrator module
- Enable multi-bead DAG execution

### Phase 5: Rigs + Terminal
- Rebuild agent roster as Rig workbench
- Add terminal bar with xterm.js
- Role badges (polecat/crew/etc.)

### Phase 6: Refinery
- Build code review queue
- Wire approval gates into workflow
- Add merge strategy settings

## Key Decisions Needed

1. **Data migration**: Keep Prisma models as-is + add Gastown fields, or rename models?
   - **Recommended**: Keep models, add Gastown as view layer. Less risk, faster migration.

2. **Mayor vs Krishna**: Replace or coexist?
   - **Recommended**: Mayor replaces Krishna for workforce context. Krishna stays for general chat.

3. **Convoy execution**: New mode alongside current scheduler, or replace it?
   - **Recommended**: New mode first, deprecate scheduler gradually.

4. **Terminal bar**: Use xterm.js (heavy) or simple log stream?
   - **Recommended**: Start with simple log stream, add xterm.js later if needed.

5. **Real-time updates**: SSE/WebSocket now, or polling first?
   - **Recommended**: Keep existing polling (5s/10s), add SSE in Phase 6.

## Open Questions
- Should digital employee personalities (Rupali, Anvar, etc.) be preserved as "crew" roles?
- Should the existing approval system map to Refinery or remain separate?
- Is the current `Workflow` + `WorkflowTask` model sufficient for Convoy DAGs?
