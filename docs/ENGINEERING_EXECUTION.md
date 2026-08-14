# EKVAAR OS — D6 ENGINEERING EXECUTION ARCHITECTURE

*(Note: This document defines the engineering blueprint for EKVAAR OS. It strictly avoids vendor, framework, or cloud provider selections, focusing entirely on structural software engineering principles).*

## 1. TECHNICAL PHILOSOPHY

- **Modular Monolith vs Microservices**: EKVAAR OS must be built as a Modular Monolith. Microservices introduce network latency and partition failure risk. Because KRISHNA and the Agent Runtimes require massive, instantaneous context retrieval, network boundaries between domains are unacceptable. Logical isolation is achieved at the folder/module level, not the network level.
- **Event-Driven vs Request-Driven**: Hybrid. Founder UI interactions are synchronous Request-Driven (for immediate UX feedback). Agent workflows and telemetry are asynchronous Event-Driven (to prevent blocking the main thread during LLM generation).
- **Single Source of Truth**: The Relational Database is the absolute arbiter of state. The Vector database is a derivative cache of the Relational DB.
- **AI Native Principles**: The system does not "call" AI; the system *is* the AI. The architecture assumes LLM inference is as fundamental as a database read, requiring strict timeout, retry, and validation boundaries at the deepest architectural levels.

---

## 2. FRONTEND ARCHITECTURE

- **Desktop Shell**: A headless container that acts as the global event listener (capturing `CMD+K`, `CMD+Space`).
- **State Management**: A global reactive store. Because Workspaces are merely "filters," the frontend holds the entire user context in a unified state tree. Changing a Workspace simply re-evaluates the filter functions applied to the DOM.
- **Navigation Architecture**: Flat routing. There are no deeply nested URL routes. The OS toggles between 4 primary view states (Desktop Void, Mission Control, Vault, Telemetry) and dynamically mounts Modals over them based on global state flags (e.g., `isKrishnaActive = true`).
- **Real-Time Updates**: WebSockets push diffs from the Backend Event Bus directly into the Frontend Global Store to ensure the DAG updates without page reloads.

---

## 3. BACKEND ARCHITECTURE

The backend is logically partitioned into strict domains:
- **Organization Service**: Manages Departments, Users, and Roles.
- **Mission Service**: The Directed Acyclic Graph (DAG) state machine. Manages Projects, Tasks, and Outputs.
- **Knowledge Service**: Manages the Decision Registry and Fact assimilation.
- **Agent Service**: Manages the sandboxed lifecycle of AI workers.
- **Automation Service**: The mechanical workflow engine that transitions states.
- **Intelligence Service**: Background telemetry and anomaly detection.

*Rule: A domain cannot query another domain's database table directly. It must use the domain's exported API function.*

---

## 4. KRISHNA RUNTIME ARCHITECTURE

KRISHNA is the semantic router of the OS, composed of sub-runtimes executed in sequence:
1. **Conversation Runtime**: Ingests the raw Founder intent.
2. **Search/Memory Runtime**: Fetches relational Decisions and semantic Knowledge relevant to the intent.
3. **Planning Runtime**: Synthesizes the context to generate a proposed DAG or Command.
4. **Execution Runtime**: Once the Founder approves, KRISHNA translates the proposal into strict JSON payloads and dispatches them to the Mission Service.

---

## 5. AGENT RUNTIME ARCHITECTURE

- **Agent Lifecycle**: Stateless and ephemeral. An Agent does not "run" continuously.
- **Orchestration**:
  1. The Mission Service emits a `TaskAssigned` event.
  2. The Agent Runtime spins up a process, fetching the exact Context Envelope.
  3. The LLM is prompted.
  4. **Supervision**: The runtime enforces strict JSON-schema validation on the response. If it fails, it enters a retry loop.
  5. The runtime returns the `DraftOutput` and spins down.
- **Agent Memory**: Agents have zero long-term memory. All memory must be explicitly injected via the Context Envelope by KRISHNA.

---

## 6. KNOWLEDGE ARCHITECTURE

- **Decision Registry**: Highly structured, strict-schema relational data. Accessed deterministically by exact ID.
- **Document/Memory Store**: Unstructured or semi-structured data. Chunked and embedded for semantic retrieval.
- **Retrieval Engine**: When assembling a Context Envelope, the Retrieval Engine runs a Hybrid Query: It pulls exact active Decisions via SQL, and semantically relevant past Outputs via K-NN vector search, merging them into a single string block.

---

## 7. SEARCH ARCHITECTURE

Federated retrieval strategy triggered by `CMD+K`:
1. **Global/Exact Search**: Checks regex patterns for exact IDs (e.g., `T-402`). `O(1)` retrieval from the relational database.
2. **Semantic Search**: If no exact ID matches, the query is embedded and searched against the Vector DB for conceptual matches.
3. **Command Search**: Searches the hardcoded registry of OS actions (e.g., `/vault`, `/new-mission`).

---

## 8. EVENT ARCHITECTURE

The backbone of OS automation.
- **Event Ledger**: An append-only relational table storing every system event (`MissionCreated`, `TaskCompleted`, `AgentFailed`).
- **Producers**: The core services (e.g., Agent Service emits `OutputGenerated`).
- **Consumers**: The Automation Service and the Real-Time WebSocket server.
- **Event Bus**: In V1, this is an in-memory or simple database-backed queue to avoid external infrastructure complexity.

---

## 9. INTELLIGENCE ARCHITECTURE

- **Metrics Pipeline**: High-throughput ingestion of raw numeric data.
- **Signal Detection**: A background cron-job that periodically runs SQL queries comparing the latest Metrics against threshold values defined in the Decision Registry.
- **Risk/Opportunity Engine**: If a Signal breaches a threshold, an Event is emitted. KRISHNA intercepts this Event, analyzes the anomaly against the Knowledge Graph, and generates a plain-text synthesis for Mission Control.

---

## 10. AUTOMATION ARCHITECTURE

The deterministic state machine that prevents the OS from stalling.
- **Workflow Engine**: Listens to the Event Bus. When `OutputApproved` is detected, it transitions the Task state to `Completed`.
- **Trigger Engine**: Instantly scans the DAG. If all dependencies for `Task_C` are now `Completed`, it transitions `Task_C` to `Executing` and fires a `TaskAssigned` event.
- **Escalation Engine**: If the Agent Service emits `TaskFailed` 3 times consecutively, the Escalation Engine forces the Task status to `Blocked` and surfaces it in Mission Control.

---

## 11. SECURITY ARCHITECTURE

- **Data Isolation**: The most critical security feature. LLM Agents are completely isolated from the database. An Agent cannot execute an arbitrary SQL query. They can only read the Context Envelope provided to them and return a JSON string.
- **Authorization**: Flat RBAC in V1. The Founder role has global Read/Write. Agents have zero systemic Read/Write access (they mutate state via the strictly controlled Agent Runtime API).
- **Audit Trails**: Ensured automatically by the Event Ledger.

---

## 12. REAL-TIME ARCHITECTURE

- **Synchronization Model**: Unidirectional data flow.
- **Server-to-Client**: The backend uses Server-Sent Events (SSE) or WebSockets to push UI diffs (e.g., "Task 4 changed from Executing to Awaiting_Approval").
- **Client-to-Server**: The frontend uses standard REST/HTTP payloads to trigger actions. The frontend never writes directly to the WebSocket.

---

## 13. DEPLOYMENT ARCHITECTURE

- **Development Environment**: Features heavy mocking. LLM calls are intercepted and return hardcoded JSON to allow engineers to build the DAG state machine without incurring API costs.
- **Agent Sandbox (Staging)**: Runs regression tests on Agent prompts. Automatically runs the latest KRISHNA prompt against the last 100 historical Tasks to ensure the output schema does not break before deploying to Prod.
- **Production Environment**: The live instance holding the immutable Company Brain.

---

## 14. SCALABILITY ARCHITECTURE

- **Stage 1 (Founder Only)**: Vertical scaling. The entire Modular Monolith runs on a single robust compute instance. DB and Web Server on the same virtual network.
- **Stage 2 (Small Team)**: Scaling the Database instance to handle increased read-heavy Vector queries.
- **Stage 3 (Growing Org)**: The Modular Monolith is split. The Agent Runtime (compute-heavy) is decoupled into scalable worker nodes, while the Core OS (State Machine) remains a high-speed Monolith.

---

## 15. V1 ENGINEERING BLUEPRINT

To guarantee EKVAAR OS ships successfully, V1 Engineering imposes ruthless constraints:

- **Strict Monolith**: No external message brokers (Kafka/RabbitMQ) and no external caching layers (Redis). Use the relational database for queuing and state.
- **Two Databases Maximum**: One relational database for exact state, one vector solution for semantics. Do not add graph databases or document stores.
- **Synchronous Fallback**: While the architecture is event-driven, V1 must allow for synchronous execution fallbacks to ensure UI stability. 
- **Zero-Latency Target**: The non-LLM portions of the OS (filtering workspaces, navigating to the Vault) must render in under 50ms. The UI cannot block while waiting for LLM inference.
