# EKVAAR OS — P16 PLATFORM & TECHNICAL ARCHITECTURE

## 1. PLATFORM PHILOSOPHY

**The Ideal Architecture: Modular Monolith**
- **Why not Microservices?** Microservices introduce network latency, eventual consistency issues, and massive dev-ops overhead. For an LLM-heavy OS where KRISHNA must deterministically sequence execution and evaluate context instantly, network partitioning is fatal.
- **Why Modular Monolith?** It allows the system to be logically separated into bounded contexts (Kernel, Execution, Knowledge) while maintaining single-process memory speed and atomic database transactions. It provides the speed of a monolith with the organizational clarity of microservices.

---

## 2. CORE RUNTIME ARCHITECTURE

The OS is divided into distinct execution domains:
1. **Kernel Runtime (KRISHNA)**: The central brain. Parses incoming intent and coordinates other runtimes.
2. **Knowledge Runtime**: Manages vector embeddings, semantic retrieval, and Decision Registry queries.
3. **Execution Runtime**: The state machine. Manages the DAG (Missions → Tasks → Outputs).
4. **Agent Runtime**: The highly-sandboxed execution environment where LLMs process Context Envelopes.
5. **Automation Runtime**: The background event bus that processes mechanical state transitions.
6. **Interface Runtime**: The headless API layer serving the Desktop GUI.

---

## 3. OBJECT STORAGE ARCHITECTURE

**Storage Model**: A strict Relational Database (SQL-style) architecture.
- **Objects**: Missions, Projects, Tasks, Outputs, Decisions, Metrics, Agents, and People are highly structured relational entities.
- **Ownership**: Foreign key constraints strictly enforce ownership (e.g., a Task *must* belong to a Mission; an Output *must* belong to a Task).
- **Persistence Strategy**: Append-Only Ledger. Records are never updated with `DELETE` or destructive `UPDATE`. They are versioned, superseded, or tombstoned to ensure perfect auditability.

---

## 4. KNOWLEDGE STORAGE ARCHITECTURE

**The Hybrid Approach**:
- **Structured Knowledge (Decisions, Rules)**: Stored in the relational database for instant, exact-match querying during execution validation.
- **Semantic Knowledge (Documents, Outputs)**: Stored in a Vector Database. When a document is approved, it is chunked, embedded, and stored for semantic similarity search.
- **Access**: KRISHNA utilizes a hybrid-search technique (Vector Semantic Search filtered by Relational Metadata like "Domain" or "Date") to retrieve precise context.

---

## 5. EVENT ARCHITECTURE

**The Hybrid Event Model**:
- **Request-Driven (Synchronous)**: Used for UI interactions where the Founder requires immediate feedback (e.g., "KRISHNA, load the Telemetry app").
- **Event-Driven (Asynchronous)**: Used for execution. The OS relies on a central **Event Bus**.
- **Flow**: An Agent finishes a Task → emits `OutputGenerated` event → Event Bus catches it → Automation Runtime triggers `SurfaceForApproval` action.
- **Event Replay**: Crucial for rollback. If an Agent goes rogue, the system can replay events backward to restore the DAG state.

---

## 6. KRISHNA RUNTIME ARCHITECTURE

KRISHNA is a composite of specialized runtimes:
- **Memory Runtime**: Fetches historical context before reasoning begins.
- **Reasoning Runtime**: Evaluates intent against the Decision Registry constraints.
- **Planning Runtime**: Computes the DAG logic (breaking Missions into Tasks).
- **Interaction**: These runtimes execute sequentially. Intent enters → Memory injects context → Reasoning evaluates safety → Planning generates the graph → Event Bus takes over.

---

## 7. AGENT RUNTIME ARCHITECTURE

**Stateless Lambda Execution**:
Agents are not long-running servers. They are stateless, ephemeral functions.
- **Lifecycle**: Execution Runtime emits `TaskReady` → Agent Runtime spins up → Context Envelope is injected → LLM is prompted → JSON Output is validated → Agent Runtime spins down.
- **Supervision**: The Agent Runtime strictly enforces token limits, API timeouts, and JSON schema validation. If the Agent breaks schema, the runtime instantly kills the process and retries.

---

## 8. SEARCH ARCHITECTURE

- **Global Search (`CMD+K`)**: A federated query router. It simultaneously hits the Relational DB (for exact match on Mission/Task titles) and the Vector DB (for semantic concepts inside Documents).
- **Knowledge Search**: Heavily biased toward the Vector DB.
- **Decision Search**: Heavily biased toward the Relational DB (must be exact).

---

## 9. INTELLIGENCE ARCHITECTURE

**The Pipeline**:
1. **Metrics Ingestion**: Raw data streams hit the DB.
2. **Signal Generator**: Background cron-jobs evaluate metrics against thresholds. If breached, emits a `SignalEvent`.
3. **Insight Compiler**: KRISHNA's LLM consumes the `SignalEvent` and queries the Knowledge Vault for context.
4. **Recommendation Engine**: Proposes an actionable Command to the Founder based on the Insight.

---

## 10. AUTOMATION RUNTIME

**The Mechanical Muscle**:
- **Trigger Processing**: Listens to the Event Bus for state changes.
- **Workflow Execution**: Steps through rigid, hardcoded pipelines (e.g., When Output = Approved, change Task = Complete, unlock Next Task).
- **Escalation Handling**: If a workflow loop detects an error code from the Agent Runtime 3 times, it halts the pipeline and emits an `EscalationEvent`.

---

## 11. SECURITY ARCHITECTURE

- **Authentication**: Validates human identity at the Interface boundary.
- **Authorization**: The Governance Engine checks every write-action against the Role Model.
- **Isolation**: Agent Runtimes are entirely air-gapped from the Relational Database. Agents only receive a string-based Context Envelope; they cannot execute SQL queries.
- **Auditability**: Every API request and Event Bus transition is logged with a cryptographic-style timestamp.

---

## 12. SCALABILITY ARCHITECTURE

- **V1 (Single Founder)**: Vertically scaled. Everything runs on a single high-performance instance.
- **Evolution**: The architecture is designed to scale on two axes. The *Relational State Machine* can remain centralized, while the *Agent Runtime* (the compute-heavy LLM interaction layer) can be scaled horizontally to support swarms as the company grows.

---

## 13. RELIABILITY ARCHITECTURE

- **Failure Handling**: LLM APIs are inherently unreliable. The Agent Runtime utilizes exponential backoff for network failures and strict LLM-retry loops for logic failures.
- **Redundancy**: Standard Multi-AZ database replication.
- **Recovery**: Because state changes are event-driven and append-only, a corrupted Task can simply be marked `[DEPRECATED]` and re-run.

---

## 14. DEPLOYMENT ARCHITECTURE

- **Development**: Local environment with mocked LLM responses to test DAG logic cheaply.
- **Agent Sandbox**: A staging environment where new KRISHNA prompts or Agent models are run against historical, completed Tasks to ensure their outputs do not degrade before touching Production.
- **Production**: The live environment containing the immutable Company Memory.

---

## 15. V1 TECHNICAL BLUEPRINT

To prevent premature scaling and enterprise over-engineering, V1 imposes strict technical constraints:

- **The Monolith**: V1 will be a single, unified codebase containing KRISHNA, the Execution DAG, and the Automation Engine.
- **Two Databases**: One Relational DB (for State, Decisions, and DAGs) and one Vector DB (for Semantic Knowledge). No complex caching layers (Redis) or standalone message brokers (Kafka) are required for V1 throughput.
- **Synchronous Fallback**: While the Event Bus is the goal, V1 will utilize synchronous request-driven logic for basic execution to guarantee system stability at launch.
- **Agent Sandboxing**: Achieved via strict Prompt Engineering (the Context Envelope) and JSON validation, deferring complex container-level (Docker) isolation for Agents until V2.
