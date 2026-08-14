# EKVAAR OS — D1 INFORMATION ARCHITECTURE

*(Note: This specification builds upon the 20-part EKVAAR OS Constitution, translating philosophical and system constraints into concrete data structures and relationships).*

## 1. OBJECT MAP

The structural ontology of the operating system.

**The Execution Graph:**
- **Mission**: The macro strategic objective. Owns Projects and Initiatives.
- **Project/Initiative**: A bounded execution sequence. Owns Tasks.
- **Task**: The atomic unit of execution. Owns Outputs.
- **Output**: The tangible deliverable produced by an Agent or Human.

**The Knowledge Graph:**
- **Decision**: A locked constitutional constraint. Governs all Tasks.
- **Knowledge**: An approved Fact, SOP, or Truth. Governs Agents.

**The Intelligence Graph:**
- **Metric**: A continuous stream of reality.
- **Signal**: A threshold breach of a Metric.

**The Entity Graph:**
- **Organization**: The root node.
- **Department**: A persistent contextual domain.
- **Agent**: The computational worker.
- **Person**: The human validator (Founder).

---

## 2. APPLICATION MAP

Strict separation of data ownership to prevent UI bloat.

- **KRISHNA Kernel**: Owns nothing persistently. It is the router of all data.
- **Mission Control**: Owns the Execution Graph (Missions, Projects, Tasks, Outputs, Signals).
- **Knowledge Vault**: Owns the Knowledge Graph (Decisions, Facts, SOPs).
- **Telemetry**: Owns the Intelligence Graph (Metrics).
- **Virtual HQ**: Owns the Entity Graph (Visualizes Departments and Agent load).

---

## 3. NAVIGATION HIERARCHY

The user traverses information via depth, not disparate screens.

- **Level 1 (The Void)**: The KRISHNA CLI/Voice interface.
- **Level 2 (The Core)**: The 4 Core Apps (Mission Control, Knowledge Vault, Telemetry, Virtual HQ).
- **Level 3 (The Domain)**: Filtered context (e.g., Mission Control filtered by the "Brand" Department).
- **Level 4 (The Node)**: Granular object detail (e.g., The raw JSON of Task #402).

---

## 4. GLOBAL OBJECTS

Objects that exist system-wide and are referenced by everything:
- **Decisions**: A Decision made in the Vault instantly alters a Task in Mission Control.
- **Agents**: Agents are global resources dynamically allocated to any Department.
- **Metrics**: A global truth that can trigger an action anywhere in the OS.

---

## 5. LOCAL OBJECTS

Objects whose existence is strictly bounded by their parent:
- **Tasks**: A Task cannot exist without a parent Project/Mission.
- **Outputs (Drafts)**: A Draft only exists attached to the Task that generated it. If the Task is deleted, the Draft is destroyed.
- **Conversations**: Ephemeral. Bound only to the active KRISHNA session.

---

## 6. SEARCH ARCHITECTURE

How `CMD+K` parses reality:
1. **Exact Object Title (Relational)**: Matches Mission IDs, Decision IDs, or Agent Names instantly.
2. **Semantic Content (Vector)**: Matches concepts inside Knowledge nodes or past Outputs.
3. **Metadata (Filtering)**: "Show me all blocked Tasks in the Brand Department."

---

## 7. WORKSPACE ARCHITECTURE

Workspaces are Cognitive Filters, not physical folders.
- **Founder Workspace**: The global, unfiltered root view.
- **Domain Workspaces (Brand, Finance)**: Engaging a domain Workspace applies a global SQL/Metadata filter to every app. Open Mission Control in the Brand workspace, and you *only* see Brand DAGs. Open the Vault, and you *only* see Brand Decisions.

---

## 8. APPLICATION RELATIONSHIP MAP

Information flows unidirectionally to prevent logic loops:
- **Telemetry** detects anomalies and pushes Signals to **KRISHNA**.
- **KRISHNA** synthesizes Signals and proposes **Decisions** to the **Knowledge Vault**.
- The **Knowledge Vault** locks the Decision and projects constraints onto **Mission Control**.
- **Mission Control** executes Tasks, producing data that flows back to **Telemetry**.

---

## 9. OWNERSHIP MAP

- **The Organization** owns the Knowledge Vault and the Decision Registry.
- **The Founder** owns the Missions and the Capital.
- **The Agents** temporarily "own" Tasks and Draft Outputs while executing. Once an Output is approved, ownership instantly transfers to the Organization.

---

## 10. LIFECYCLE MAP

- **Missions**: Proposed → Active → Blocked → Completed → Archived.
- **Tasks**: Pending → Assigned → Executing → Awaiting Approval → Completed.
- **Outputs**: Draft → Rejected (Destroyed/Recycled) → Approved (Becomes Knowledge).
- **Decisions**: Proposed → Locked (Active) → Superseded (Archived).

---

## 11. CONTEXT ARCHITECTURE

- **Context Preservation**: If the Founder is querying KRISHNA about "Task 4", and then opens the Knowledge Vault, KRISHNA automatically pre-fills the Vault search with semantic vectors related to Task 4. The OS never forgets what you are focused on.
- **The Context Envelope**: The mechanism by which the OS bundles local data (The Task) and global data (The Decisions) into a secure prompt for an Agent.

---

## 12. VISIBILITY ARCHITECTURE

The security permission hierarchy:
- **Founder**: Infinite visibility. Total Read/Write to all Nodes.
- **Agent**: Zero visibility. An Agent cannot browse the Knowledge Vault. It can only "see" the exact text passed to it via the Context Envelope for a specific Task.

---

## 13. DISCOVERABILITY ARCHITECTURE

- **Topological Discovery**: Using Virtual HQ to visually zoom from the Organization level down to a specific blocked Task.
- **Explicit Discovery**: Using `CMD+K` to bypass topology and jump directly to a known Node ID.
- **Relational Discovery**: Clicking a citation hyperlink in a KRISHNA message that instantly opens the exact Decision node referenced.

---

## 14. EKVAAR OS INFORMATION MAP

The unified conceptual graph:
`[Intent]` → generates → `[Mission]`
`[Mission]` → spawns → `[Tasks]`
`[Tasks]` + `[Decisions]` → wrapped into → `[Context Envelope]`
`[Context Envelope]` → sent to → `[Agent]`
`[Agent]` → produces → `[Draft Output]`
`[Draft Output]` + `[Founder Approval]` → becomes → `[Knowledge]`
`[Knowledge]` → optimizes → `[Future Intent]`

---

## 15. V1 INFORMATION ARCHITECTURE BLUEPRINT

To ensure data integrity and rapid launch velocity, Version 1 imposes absolute structural rigidity:

- **Flat Workspace**: Complex cognitive filtering (Domain Workspaces) is deferred to V2. V1 operates entirely in the "Founder Workspace" (Global visibility of all objects).
- **Strict Bounding**: No orphaned data. V1 will forcefully reject the creation of a Task if it is not bound to a Mission. Every piece of data must adhere to the Object Map.
- **Singular Search**: `CMD+K` will serve as the sole mechanism for information retrieval, avoiding the need to build complex nested folder UI components.
