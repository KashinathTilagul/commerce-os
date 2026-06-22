# EKVAAR OS — P1 SYSTEM ARCHITECTURE SPECIFICATION

## 1. LAYERED ARCHITECTURE

EKVAAR OS operates on a strict 5-layer architecture. Data strictly flows down for storage and up for presentation.

1. **Interaction Layer (I/O)**: The only layer the Founder sees. Responsible for capturing raw intent (voice/text) and rendering dynamic, ephemeral components (Outputs, Metrics, Alerts).
2. **Kernel Layer (KRISHNA)**: The central nervous system. Intercepts intent, retrieves context, plans execution graphs, and manages global state routing.
3. **Execution Layer**: The active state machine. Manages the lifecycles of Missions, Initiatives, Projects, and Tasks. Operates the workforce (Agents and Persons).
4. **Governance Layer**: The rulebook. Operates strictly in the background to govern execution. Houses the Decision Registry, Metrics Engine, and Knowledge Vault.
5. **Persistence Layer**: The absolute bottom layer. An immutable graph and vector database where the primitive objects are stored.

---

## 2. OBJECT OWNERSHIP MODEL

Every Core Object has strict ownership and modification rights.

* **Mission**: Owned by Founder. Modified by Founder/KRISHNA. Archived by Founder. Relationships: Parent to Initiatives.
* **Initiative**: Owned by Leadership/KRISHNA. Modified by Leadership. Relationships: Parent to Projects, constrained by Decisions.
* **Project**: Owned by Person/Agent (Project Manager). Modified by Owner. Relationships: Parent to Tasks.
* **Task**: Owned by Agent/Person (Executor). Modified by Owner. Relationships: Triggers Output.
* **Output**: Owned by System. Immutable once approved. Modified via versioning (new Output). Relationships: Upstreams into Knowledge.
* **Decision**: Owned by Founder/Leadership. Global governance constraint. Cannot be archived, only superseded.
* **Knowledge**: Owned by System. Systematically updated by approved Outputs and external data.
* **Metric**: Owned by System. Updated automatically via Event triggers.
* **Agent**: Owned by KRISHNA. Spawned and terminated by the Kernel.
* **Person**: Managed by OS Identity System.

---

## 3. RELATIONSHIP GRAPH

EKVAAR OS operates as a directed acyclic graph (DAG):

- **Mission** `contains` **Initiatives**.
- **Initiative** `contains` **Projects**.
- **Project** `contains` **Tasks**.
- **Task** `creates` **Output**.
- **Output** `updates` **Knowledge** and `alters` **Metrics**.
- **Decision** `constrains` (Mission, Initiative, Project, Task, Agent).
- **Knowledge** `contextualizes` (Mission, Initiative, Project, Task, Agent).
- **Agent/Person** `executes` **Task**.

---

## 4. SOURCE OF TRUTH MAP

No data is duplicated. Every object has exactly one authoritative subsystem:

- **Knowledge** → Knowledge Vault (Vector/Semantic Database)
- **Decision** → Decision Registry (Immutable Append-Only Ledger)
- **Mission / Initiative / Project / Task** → Execution State Engine (Graph Database)
- **Output** → Artifact Store (Blob Storage)
- **Metric** → Telemetry Engine (Time-Series Database)
- **Agent / Person** → Entity Directory

---

## 5. KRISHNA ARCHITECTURE

KRISHNA is broken down into 5 independent subsystems running concurrently:

**1. Intent Parser**
* **Purpose**: Translates raw human input into machine commands.
* **Inputs**: Voice/Text string.
* **Outputs**: Structured `CommandObject` (Action, Target, Constraints).
* **Dependencies**: None.

**2. Context Engine**
* **Purpose**: Retrieves the necessary background information before execution begins.
* **Inputs**: `CommandObject`.
* **Outputs**: `EnrichedCommand` (Command + relevant Knowledge + Constraints).
* **Dependencies**: Knowledge Vault, Decision Registry.

**3. Planning Engine**
* **Purpose**: Breaks a complex intent down into the Execution Flow graph.
* **Inputs**: `EnrichedCommand`.
* **Outputs**: A mapped DAG of (Initiatives → Projects → Tasks).
* **Dependencies**: Execution State Engine.

**4. Agent Router**
* **Purpose**: Assigns executable leaf-nodes (Tasks) to the correct resource.
* **Inputs**: Unassigned Tasks.
* **Outputs**: Active Agent executions.
* **Dependencies**: Entity Directory.

**5. Memory Engine**
* **Purpose**: Closes the loop by storing results.
* **Inputs**: Approved Outputs, Locked Decisions.
* **Outputs**: Indexed vectors in the Knowledge Vault.
* **Dependencies**: Artifact Store.

---

## 6. INTENT → EXECUTION PIPELINE

**Example: Founder says "Launch Luxe Collection."**

1. **Ingest**: Interaction Layer captures audio, converts to text.
2. **Parse**: Intent Parser identifies goal: `Create Mission: Launch Luxe Collection`.
3. **Contextualize**: Context Engine retrieves past launch playbooks and the brand guidelines for "Luxe".
4. **Plan**: Planning Engine generates the tree:
   - *Mission*: Launch Luxe Collection
   - *Initiative*: Marketing Campaign
   - *Project*: Social Media Assets
   - *Task*: Draft Instagram Ad Copy
5. **Route**: Agent Router assigns "Draft Instagram Ad Copy" to the `Copywriter Agent`.
6. **Execute**: Agent consumes the brand guidelines (Knowledge) and completes the Task.
7. **Deliver**: Agent creates an `Output` object (the copy).
8. **Approve**: Interaction Layer surfaces the `Output` to the Founder.
9. **Finalize**: Founder approves. Memory Engine permanently indexes the `Output` into the Knowledge Vault, and the Task is marked `Completed`.

---

## 7. MEMORY ARCHITECTURE

* **What gets remembered**: Approved Outputs, locked Decisions, resolved Tasks, Meeting transcripts, verified Metrics.
* **What does not**: Intermediate Agent scratchpads, draft iterations, aborted Tasks, parsing errors, raw audio buffers.
* **How decisions are stored**: Appended to the immutable Decision Registry with cryptographic/timestamp hashing to ensure an unbreakable chain of command.
* **How institutional memory is preserved**: Memory is decoupled from human brains. When an Agent or Person begins a Task, the Context Engine automatically injects the exact Knowledge required. If an employee leaves, the operating system retains the exact context of how every Output was generated.

---

## 8. PERMISSION ARCHITECTURE

EKVAAR operates on a strict Role-Based Access Control (RBAC) model.

* **Founder**: 
  - *View*: Global. *Edit*: Global. *Approve*: Global. *Archive*: Global. *Ownership*: Root.
* **Leadership**: 
  - *View*: Domain-specific. *Edit*: Owned Initiatives/Projects. *Approve*: Owned Outputs. *Archive*: Domain-specific.
* **Employee**: 
  - *View*: Relevant Projects. *Edit*: Assigned Tasks. *Approve*: None (must request).
* **Vendor**: 
  - *View*: Only assigned Tasks. *Edit*: Only assigned Outputs.
* **AI Agent**: 
  - *View*: Systematically granted via Context Engine (Read-Only). *Edit*: Only assigned Outputs. *Approve*: None.

---

## 9. EVENT ARCHITECTURE

The OS is entirely event-driven. Subsystems only react to emitted events via the Event Bus.

**Core Events:**
* `INTENT_RECEIVED`
* `COMMAND_PARSED`
* `MISSION_CREATED`
* `TASK_ASSIGNED`
* `TASK_BLOCKED`
* `OUTPUT_SUBMITTED`
* `OUTPUT_APPROVED`
* `OUTPUT_REJECTED`
* `DECISION_LOCKED`
* `KNOWLEDGE_INDEXED`
* `METRIC_THRESHOLD_CROSSED`

---

## 10. V1 SYSTEM BLUEPRINT

To prevent feature creep, Version 1 of EKVAAR OS will strictly contain:

**Included in V1:**
- **Layer 1 & 2**: Text/Voice Interaction Layer + simplified KRISHNA Kernel (Intent Parser + Agent Router).
- **Layer 3**: Basic Execution Flow (Missions → Tasks → Outputs). *Initiatives and Projects are skipped in V1 to reduce friction.*
- **Layer 4**: Single Knowledge Vault (Basic Retrieval-Augmented Generation). Decisions and Metrics are deferred.
- **Layer 5**: Single generalized Database.
- **Roles**: "Founder Mode" only (Global permissions). Multi-user and permissions are stripped from V1.
- **Agents**: A single General-Purpose Agent rather than a routed swarm.

**Excluded from V1:**
- Complex Planning Engines (No automatic multi-tier DAG generation).
- Initiative and Project objects.
- Multi-user RBAC.
- Metric telemetry engines.
