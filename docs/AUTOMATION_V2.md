# EKVAAR OS V2 — AUTOMATION & WORKFLOW SYSTEM SPECIFICATION

This technical specification details the V2 event-driven architecture, trigger system, workflow execution states, and human-in-the-loop safety loops implemented in EKVAAR OS V2.

---

## 1. System Philosophy

Automation in EKVAAR OS is the structural routing of business context and task lifecycles through an asynchronous Python event bus, avoiding human interaction until strict approval gates are reached.

```
[System Event] ──> [Event Bus] ──> [Trigger Matcher] ──> [Action Pipeline] ──> [Human Gate (if Level 3)]
```

- **Execution**: The localized action of an agent performing work (e.g. LLM routing, query execution).
- **Automation**: The mechanical routing of the work context (e.g. spawning a task, moving output to a thread).
- **Intelligence**: Evaluating execution parameters against business metrics (e.g. latency alerts).

---

## 2. Automation Levels & Permissions

EKVAAR OS operates across four distinct automation levels:

1. **Level 1 (Notification)**: Observes metrics or logs, generates UI toast notifications, but performs no active state modification.
2. **Level 2 (Recommendation)**: Flags exceptions and renders recommendations with custom approval buttons on the dashboard feed.
3. **Level 3 (Assisted Execution - Default)**: Spawns tasks and routes context to agents. The agent output is locked in the database and requires Human Approval before proceeding.
4. **Level 4 (Autonomous Execution)**: Reserved for read-only actions (e.g. data syncing). The system triggers actions automatically without gating.

---

## 3. Trigger & Action Catalog

### Trigger Catalog:
*   **`INTENT_RECEIVED`**: Triggered when a message is routed via the `/ws/agent` WebSocket loop.
*   **`OUTPUT_STATE_CHANGE`**: Fired when an agent task output is modified.
*   **`METRIC_SIGNAL`**: Brews when Time-Series variables breach critical thresholds.
*   **`TEMPORAL_EVENT`**: Timed triggers controlled by the async `AutomationScheduler` loop.

### Action Catalog:
*   **Context Synthesis**: Compiles prompt boundaries utilizing `soul.md` and database context refs.
*   **Agent Routing**: Routes prompts to Groq / OpenRouter fallback endpoints.
*   **DAG Generation**: Inserts nodes into `missions`, `tasks`, and `plans` tables.
*   **Escalation**: Triggers System Recovery overlay when unhandled React rendering or script errors are captured.

---

## 4. Safety & Human-in-the-Loop Architecture

- **Approval Gates**: All executions modifying external APIs (e.g. shopify syncs, outgoing notifications) must hit a Human Approval gate (marked as `WAITING_APPROVAL` in the `plans` table).
- **Sandboxed Execution**: Agent operations run via the localized `execute_python` skills registry, which isolates subprocess exceptions from halting the core API thread.
- **Rollback Architecture**: EKVAAR OS is an append-only state model. If an automated action is rejected, the system resolves the failure by appending a corrective reversion task to the active workflow tree rather than overwriting historical database entries.
