# EKVAAR OS — E4 COMPONENT INVENTORY & SYSTEM MODULE ARCHITECTURE

*(Note: This document defines the exact software modules, services, and components required to build EKVAAR OS. It bridges the gap between Repository Architecture (E1) and actual code implementation by identifying every piece of the machine).*

## 1. COMPONENT PHILOSOPHY

- **System**: The highest level. EKVAAR OS itself, composed of Applications and the Backend Monolith.
- **Module (Domain)**: A massive logical boundary within the OS (e.g., "The Mission Module").
- **Service**: The backend logic layer that exposes the Domain's capabilities (e.g., "MissionService").
- **Component**: A specific, isolated, executable unit of logic or UI (e.g., "DAG State Machine", "Context Injector").

---

## 2. CORE SYSTEM COMPONENTS

The foundational shell that holds the OS together.
- `Authentication Manager`: Handles Founder session tokens.
- `Desktop Shell`: The headless frontend container that mounts the active Workspace.
- `Workspace Filter Engine`: Evaluates the current active Topology (e.g., "Brand") and filters all global state queries.
- `Global Command Engine`: The listener for `CMD+K` and `CMD+Space`.
- `WebSocket Synchronizer`: Pushes system events from the backend to the React Global Store.

---

## 3. KRISHNA COMPONENTS

The semantic brain of the OS.
- `Intent Parser`: Classifies raw text into system commands.
- `Context Generator`: Assembles the Context Envelope for execution.
- `DAG Planner`: The LLM logic that breaks an Intent into a multi-step Mission graph.
- `Safety Evaluator`: Checks proposed plans against the Decision Registry before execution.
- `Execution Dispatcher`: Converts the approved DAG into SQL records in the Mission Service.

---

## 4. MISSION COMPONENTS

The execution engine.
- `DAG State Machine`: Calculates dependency resolution (e.g., if Task A is done, Task B moves to Executing).
- `Task Dispatcher`: Sends Executing tasks to the Agent or Human owner.
- `Approval Queue Manager`: Aggregates completed outputs for Founder review.
- `Output Version Controller`: Manages `Draft` vs `Approved` output states.

---

## 5. KNOWLEDGE COMPONENTS

The long-term memory and ruleset.
- `Decision SQL Registry`: The CRUD component for rigid constitutional constraints.
- `Document Embedder`: The component that chunks approved outputs and generates embeddings.
- `Vector Search Engine`: Performs K-NN similarity lookups.
- `Hybrid Search Router`: Merges SQL Decision results with Vector Document results into a single context array.

---

## 6. AGENT COMPONENTS

The workforce sandbox.
- `Agent Registry`: The hardcoded list of available Agent classes and their capabilities.
- `Context Injector`: Formats the `Task` and `Knowledge` into the LLM system prompt.
- `LLM Execution Client`: The API wrapper calling the underlying foundation model (e.g., Gemini).
- `JSON Schema Validator`: The strict Zod-enforcement gatekeeper for Agent outputs.
- `Retry Controller`: Manages exponential backoff and prompt-correction if the schema fails.

---

## 7. COMMUNICATION COMPONENTS

*(Note: Heavily restricted in V1, documented for architecture mapping).*
- `Thread Manager`: Links a conversation to a specific OS Entity (Task, Mission, Decision).
- `Event Broadcaster`: Emits `MessageCreated` to the Event Bus.
- `Meeting Synthesizer`: The component that processes meeting transcripts into Decisions.

---

## 8. INTELLIGENCE COMPONENTS

The proactive observation engine.
- `Metrics Ingestor`: The high-speed API catching raw numerical time-series data.
- `Cron Evaluator`: Background loop comparing Metrics against Decision thresholds.
- `Signal Emitter`: Generates a `SignalEvent` when a threshold is breached.
- `Risk Synthesizer`: The LLM component that turns a mathematical `Signal` into a semantic `Risk`.

---

## 9. AUTOMATION COMPONENTS

The mechanical muscle of the OS.
- `Event Listener`: Subscribes to the central Event Bus.
- `Trigger Engine`: Matches incoming events to active Workflows.
- `Workflow State Machine`: Executes the predefined `Actions` linked to the Trigger.
- `Escalation Controller`: Forces a Task into `Blocked` status if an Agent error loop is detected.

---

## 10. ORGANIZATIONAL COMPONENTS

The topology of the company.
- `Department Topology Engine`: Maps the hierarchy (Organization → Department → Team).
- `Role Validator`: Checks if an Actor (Person/Agent) has the explicit capability to execute an action.

---

## 11. APPLICATION COMPONENTS

The Frontend UI components that interact with the Backend Services.

**Mission Control:**
- `Mission DAG Visualizer`: Renders the project graph.
- `Task Detail Modal`: Shows Context, Output, and Chat for a specific task.
- `Founder Approval Inbox`: The unified list of items awaiting signature.

**Knowledge Vault:**
- `Decision Ledger Viewer`: The read-only list of active constitutional rules.
- `Decision Editor`: The interface for drafting new constraints.

**Telemetry:**
- `Metrics Dashboard`: Time-series graphs.
- `Risk Inbox`: Actionable alerts generated by the Intelligence Engine.

**Virtual HQ:**
- `Topology Map`: The spatial visualizer of Departments and active Agents.

---

## 12. SHARED COMPONENTS

The cross-domain utilities residing in `packages/`.
- `Event Bus`: The central queuing mechanism (In-memory or Postgres-backed for V1).
- `Schema Registry`: The Zod files defining all payloads.
- `Audit Logger`: The component that writes every state change to `system_events`.
- `UI Kit`: Core visual components (Glassmorphic Buttons, Modals, Typography).

---

## 13. DEPENDENCY ARCHITECTURE

**The Dependency Hierarchy:**
1. **Tier 1 (Foundation)**: `Shared Components`, `Organizational Components`, `Knowledge Components`. (These depend on nothing).
2. **Tier 2 (Logic)**: `Mission Components`, `Intelligence Components`. (These depend on Tier 1).
3. **Tier 3 (Compute)**: `Agent Components`, `KRISHNA Components`. (These depend on Tier 1 & 2 to generate Context).
4. **Tier 4 (Mechanical)**: `Automation Components`. (These depend on the Event Bus).
5. **Tier 5 (Presentation)**: `Application Components`. (These depend on everything).

---

## 14. V1 COMPONENT INVENTORY (The Minimum Buildable OS)

To achieve V1 Launch (as defined in D7), we will strictly build **only** the following components. All others are deferred to V2.

**Frontend (React):**
- Desktop Shell & `CMD+K` Bar
- Mission Control (Inbox & Task Modal only; no complex DAG visualizer yet)
- Knowledge Vault (Decision Ledger & Editor)

**Backend (Modular Monolith):**
- **Core**: PostgreSQL Schema, Event Bus, Audit Logger, Schema Registry.
- **Mission Module**: DAG State Machine, Task Dispatcher.
- **Knowledge Module**: Decision SQL Registry (No Vector/Document engine yet; structured Decisions only).
- **Agent Module**: Agent Registry, Context Injector, JSON Schema Validator, LLM Execution Client.
- **KRISHNA Module**: Intent Parser, Context Generator, Execution Dispatcher.

---

## 15. FINAL SYSTEM INVENTORY

The official component breakdown for EKVAAR OS V1 Execution:

| Module | Component | Priority | Dependency |
| :--- | :--- | :--- | :--- |
| **Shared** | Schema Registry (Zod) | P0 | None |
| **Shared** | Audit Logger (Events) | P0 | Schema Registry |
| **Knowledge** | Decision SQL Registry | P0 | Schema Registry |
| **Mission** | DAG State Machine | P1 | Decision Registry |
| **Mission** | Task Dispatcher | P1 | DAG State Machine |
| **Agent** | Context Injector | P1 | Mission, Knowledge |
| **Agent** | JSON Validator | P1 | Context Injector |
| **KRISHNA** | Intent Parser | P1 | Schema Registry |
| **KRISHNA** | Execution Dispatcher | P1 | Intent Parser |
| **Frontend** | Desktop Shell & CMD+K | P2 | KRISHNA |
| **Frontend** | Founder Inbox | P2 | Mission |
| **Frontend** | Decision Editor | P2 | Knowledge |

*This inventory forms the exact ticket backlog for Phase 0 and Phase 1 engineering execution.*
