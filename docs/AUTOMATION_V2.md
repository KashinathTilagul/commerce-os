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

---

## 5. Workflow Definition

**Definition:** A predetermined, repeatable sequence of automated Triggers, Actions, and Approval Gates designed to execute a standardized operational procedure (SOP).
**Differences:**
- *Projects* are unique, temporary, bounded executions.
- *Workflows* are the permanent "pipes" through which Projects flow.
- *Tasks* are the individual droplets of water moving through the pipe.

---

## 6. Approval Architecture

The security model of the execution engine.
**Requires Human Approval:**
- Finalizing any Output to become permanent Company Knowledge.
- Altering or Superseding a Decision.
- Resolving a Level 1 vs Level 1 Knowledge Conflict.
**KRISHNA Executes Independently:**
- Shifting Task states (Pending -> In Progress).
- Re-assigning an Agent after an API timeout.
- Generating draft nodes in the DAG.

---

## 7. Workflow Lifecycle

The state machine for a permanent Workflow pipeline:
1. **Proposed**: Synthesized by KRISHNA based on repeating DAG patterns.
2. **Active**: Listening for Triggers.
3. **Paused**: Suspended (e.g., if a dependent API is down).
4. **Deprecated**: Retired because a governing Decision changed, rendering the Workflow obsolete.

---

## 8. Workflow Ownership

- **Owner**: The System (KRISHNA).
- **Creator**: KRISHNA proposes based on Intelligence; Founder approves.
- **Modifier**: Changes automatically if a core Decision constraints it.
- **Retirement**: Governed by the Decision Registry. If a Decision dies, dependent workflows die with it.

---

## 9. Automation Safety Model

**Mistake Prevention**: All automated actions are sandboxed internally.
**Decision Constraints**: The Automation Engine cannot trigger an Action that violates a locked Decision. If a workflow attempts to do so, KRISHNA's Reasoning Engine severs the connection.
**Harmful Actions**: Prevented by the "Draft Model." Because Level 4 Autonomous Execution is heavily restricted, Agents cannot physically alter reality (e.g., spend money, send emails) without hitting a Level 3 Human Approval Gate.
**Rollback**: The system is an append-only ledger. Rollback is achieved by appending a "Revert State" node to the DAG.

---

## 10. Human-in-the-Loop Model

- **When humans MUST intervene**: Resolving Escalations, locking strategic Outputs, making capital decisions.
- **When humans SHOULD intervene**: Providing nuanced qualitative feedback when an Agent fails a Task twice.
- **When humans STAY OUT**: Mechanical routing, Agent model selection, API retry logic, and context assembly.

---

## 11. Agent Automation Model

- **Participation**: Agents are the "leaf nodes" of a Workflow. The Workflow delivers the Context Envelope; the Agent returns a JSON payload.
- **Coordination**: Agents are oblivious to Workflows. They do not coordinate with other Agents. The Automation Engine acts as the absolute intermediary.
- **Failure**: If an Agent fails to return a valid payload, the Automation Engine triggers an auto-retry loop (Max 3). Upon final failure, it halts the Workflow branch and Escalates.

---

## 12. Learning Workflow Model

- **Successful Workflows**: Pipelines that consistently run end-to-end with zero Founder rejections establish baseline velocity metrics.
- **Degraded Workflows**: If a Workflow constantly results in Rejected Outputs at Step 3, KRISHNA flags the Workflow as "Degraded" and recommends an architectural modification to the Founder (e.g., "Agent 3 lacks sufficient Decision constraints").

---

## 13. Workflow Intelligence Model

- **Bottlenecks**: KRISHNA detects when a specific Node in a Workflow exceeds its median historical cycle time (e.g., "The Founder is taking 4 days to approve Step 2").
- **Optimization**: KRISHNA detects redundant steps (e.g., "Step 4 has been auto-approved 100% of the time for 3 months. Recommend shifting this step to Level 4 Autonomous Execution.").

---

## 14. Automation Engine Architecture

**Purpose**: The background, high-concurrency event bus that listens for Triggers and executes Actions.
**Relationship with KRISHNA**: The Automation Engine is the mechanical muscle; KRISHNA's Reasoning Engine is the brain. The Automation Engine is completely unintelligent—it blindly executes the routing rules defined by KRISHNA.

---

## 15. V1 Automation Blueprint

To prevent system collapse through hallucination or infinite loops, V1 imposes extreme safety constraints:

- **Fixed Level 3 Automation**: EVERY execution workflow in V1 ends in a Human Approval Gate. There is strictly ZERO Level 4 (Autonomous Execution) capability in V1.
- **Hardcoded Workflows Only**: V1 will not support dynamic, KRISHNA-generated workflows. It will operate entirely on rigid, hardcoded OS pipelines (Intent → Generate Task DAG → Assign Agent → Surface Output for Approval).
- **Internal Triggers Only**: Triggers are limited to internal OS state changes (e.g., Command received, Output approved). External webhooks (Zapier, email listeners) are deferred to V2.
