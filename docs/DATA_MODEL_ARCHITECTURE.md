# EKVAAR OS — E2 DATA MODEL ARCHITECTURE

*(Note: This document defines the canonical, conceptual data structures that power EKVAAR OS. It avoids specific database syntax, ORM selections, or storage engine details, focusing strictly on entities, lifecycles, and relationships).*

## 1. DATA PHILOSOPHY

- **Single Source of Truth**: EKVAAR OS is a state machine. The relational data model is the absolute, unquestionable source of truth. Vector data and frontend state are downstream derivatives.
- **Append-Only Ledger**: State mutations (especially Execution and Knowledge) are tracked via an append-only event ledger. We do not destroy history; we append state changes.
- **Strict Ownership**: Every executable entity (Mission, Task, Decision) must have a deterministic owner (a Person or an Agent). Orphaned tasks represent organizational failure.
- **Immutability of Truth**: Once an `Output` is approved and assimilated into `Knowledge`, it cannot be silently edited. It must be explicitly *Superseded* by a new Decision or Output.

---

## 2. CORE ENTITY MODEL

The EKVAAR OS domain is divided into functional clusters:

- **Entity Cluster**: `Organization`, `Department`, `Team`, `Person`, `Agent`
- **Execution Cluster**: `Mission`, `Initiative`, `Project`, `Task`, `Output`
- **Brain Cluster**: `Knowledge_Node`, `Decision`, `Metric`
- **Intelligence Cluster**: `Signal`, `Risk`, `Opportunity`
- **Automation Cluster**: `Workflow`, `Event`

---

## 3. ENTITY RELATIONSHIP GRAPH (MACRO)

**The Execution Flow:**
`Organization` → (has many) `Departments` → (has many) `Teams`
`Team` → (owns) `Missions` → (broken into) `Initiatives/Projects` → (broken into) `Tasks`
`Task` → (assigned to) `Agent` or `Person` → (produces) `Output`
`Output` → (if approved, becomes) `Knowledge_Node`

**The Governance Flow:**
`Decision` → (constrains) `Task`
`Metric` → (triggers) `Signal` → (generates) `Risk/Opportunity` → (requires new) `Decision`

---

## 4. MISSION DATA MODEL (Execution)

The Directed Acyclic Graph (DAG) of work.
- **Attributes**: `ID`, `Title`, `Intent`, `Status`, `Priority`, `Context_Tags`.
- **Relationships**: Belongs to `Organization`. Has many `Tasks`. Constrained by `Decisions`.
- **Ownership**: Explicitly owned by one `Person` (Founder/Executive) or `Agent` (KRISHNA).
- **Lifecycle**: `Draft` → `Active` → `Blocked` → `Completed` → `Archived`.
- **Dependencies**: Tasks have explicit `depends_on` relationships. A Task cannot transition to `Executing` until its dependencies are `Completed`.

---

## 5. KNOWLEDGE DATA MODEL (The Brain)

The memory and ruleset of the company.
- **Entities**:
  - `Decision`: A rigid, constitutional rule (e.g., "Maximum customer acquisition cost is $15").
  - `SOP`: A sequential procedure.
  - `Fact`: A verified data point.
- **Attributes**: `ID`, `Type`, `Content`, `Confidence_Score` (0-100), `Valid_From`, `Valid_To`.
- **Inheritance**: Knowledge Nodes inherit context from the Mission/Output that generated them.
- **Versioning**: Decisions are strongly versioned. A new Decision on the same topic marks the previous as `Superseded`.

---

## 6. AGENT DATA MODEL (The Workforce)

The stateless workforce representations.
- **Attributes**: `ID`, `Name`, `Role_Definition`, `System_Prompt_Template`, `Status` (Idle, Executing, Error).
- **Capabilities**: Array of permissible OS actions (e.g., `can_read_vault`, `can_draft_output`).
- **Memory**: Agents have *no persistent memory fields*. Their memory is entirely injected via the Context Envelope for each specific Task.
- **Lifecycle**: Immutable definitions. Agents are "Spun Up" for a Task and "Spun Down" immediately after.

---

## 7. COMMUNICATION DATA MODEL

- **Entities**: `Conversation`, `Message`.
- **Attributes**: `Thread_ID`, `Participants`, `Content`, `Timestamp`.
- **Relationships**: Communications are strictly attached to an entity. A Conversation does not exist in a void; it belongs to a `Task`, a `Mission`, or a `Decision`.
- **Retention**: Transient (wiped after 30 days) vs. Archived (assimilated into Knowledge if marked as "Important").

---

## 8. ORGANIZATIONAL DATA MODEL

- **Attributes**: `ID`, `Name`, `Topology_Level`.
- **Relationships**: Strict hierarchical tree. An `Organization` is the root node.
- **Ownership**: Departments own their specific Knowledge Nodes and Metrics. For example, the "Brand" department workspace filters the Knowledge Graph to only show Brand-owned nodes.

---

## 9. INTELLIGENCE DATA MODEL

- **Entities**:
  - `Metric`: Raw numerical time-series data (e.g., `Revenue`, `Latency`).
  - `Signal`: A detected anomaly or threshold breach.
  - `Risk` / `Opportunity`: The semantic interpretation of a Signal.
- **Generation Rules**: Background cron-jobs evaluate `Metrics` against `Decisions`. If `Metric > Decision.Threshold`, generate `Signal`. KRISHNA consumes the `Signal` to generate a `Risk`.

---

## 10. AUTOMATION DATA MODEL

- **Entities**: `Workflow`, `Trigger`, `Action`, `Execution_Log`.
- **Trigger**: "When X happens" (e.g., `Event.Type == Output_Approved`).
- **Action**: "Do Y" (e.g., `Update Task.Status = Completed`).
- **Dependencies**: Automation workflows are hardcoded state transitions ensuring the OS does not stall waiting for human input on mechanical steps.

---

## 11. EVENT DATA MODEL (The Ledger)

The central nervous system history.
- **Structure**: `Event_ID`, `Trace_ID` (for grouping), `Topic` (e.g., `Task_Completed`), `Payload` (JSON snapshot), `Actor` (Person/Agent), `Timestamp`.
- **Ownership**: The System owns the Event Ledger. It is append-only.
- **Retention**: Permanent. Events are never deleted. They are used for audit trails and temporal replays.

---

## 12. GRAPH ARCHITECTURE

While stored relationally, data forms semantic graphs:
- **Knowledge Graph**: `Decisions` connect to `SOPs` which connect to `Tasks`.
- **Mission Graph**: The topological execution DAG.
- **People/Agent Graph**: The collaboration web (who interacts with whom).

---

## 13. VERSIONING ARCHITECTURE

- **What gets versioned**: `Decisions`, `SOPs`, and constitutional `Knowledge_Nodes`.
- **Tracking**: A `version_group_id` links revisions.
- **Preservation**: The `Active` version is queried by default. Previous versions are marked `Superseded`.
- **Rollbacks**: Reverting a Decision creates a *new* version identical to the old one, appending to the ledger rather than rewriting history.

---

## 14. DATA LIFECYCLE ARCHITECTURE

All major entities follow strict status enums:
- **Created / Draft**: Instantiated but not executing or enforcing rules.
- **Active / Executing**: Currently processing or acting as the system truth.
- **Archived / Superseded**: Retained for historical context and AI training, but excluded from active Context Envelopes.
- **Deleted**: Soft-deleted (flagged `is_deleted = true`). Hard deletes are strictly reserved for legal/compliance GDPR requirements.

---

## 15. CANONICAL DATA BLUEPRINT

The core EKVAAR OS is fundamentally driven by the interaction of three main loops:
1. **The Intelligence Loop**: `Metrics` → `Signals` → `Risks/Opportunities`.
2. **The Execution Loop**: `Missions` → `Tasks` → `Agents` → `Outputs`.
3. **The Governance Loop**: `Outputs` → `Decisions` → `Knowledge`.

This data architecture completely isolates transient execution data (Tasks) from permanent foundational data (Decisions), allowing KRISHNA to assemble perfect Context Envelopes without database locking or data corruption.
