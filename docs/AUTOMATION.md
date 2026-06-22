# EKVAAR OS — P13 AUTOMATION & WORKFLOW ARCHITECTURE

## 1. AUTOMATION DEFINITION

**Definition:** Automation in EKVAAR OS is the systematic bypassing of human intervention in the routing, generation, and flow of internal data.
**What it is NOT:** It is not a drag-and-drop Zapier canvas. It is a native, hardcoded event bus.
**The Distinction:**
- *Execution* is doing the work (e.g., an Agent writing the draft).
- *Automation* is routing the work (e.g., detecting the draft is finished and alerting the Founder).
- *Intelligence* is analyzing the work (e.g., realizing the draft took too long).

---

## 2. WORKFLOW DEFINITION

**Definition:** A predetermined, repeatable sequence of automated Triggers, Actions, and Approval Gates designed to execute a standardized operational procedure (SOP).
**Differences:**
- *Projects* are unique, temporary, bounded executions.
- *Workflows* are the permanent "pipes" through which Projects flow.
- *Tasks* are the individual droplets of water moving through the pipe.

---

## 3. AUTOMATION LEVELS

1. **Level 1 (Notification)**: The system observes a Trigger and notifies the Founder. No Action is taken.
2. **Level 2 (Recommendation)**: The system observes a Trigger and proposes an Action (e.g., "Output rejected. Should I respawn the Task?").
3. **Level 3 (Assisted Execution)**: The system automatically routes work to an Agent, but the Agent's Output is gated and requires Human Approval to proceed to the next step.
4. **Level 4 (Autonomous Execution)**: The system routes work to an Agent, evaluates the Output against Decisions itself, auto-approves it, and instantly triggers the next Action without human awareness.

---

## 4. TRIGGER ARCHITECTURE

Workflows are initiated by state changes in the core OS objects.
**Trigger Catalog:**
- **Intent Received:** Founder speaks/types a command.
- **Output State Change:** Output moves to `Pending`, `Approved`, or `Rejected`.
- **Knowledge State Change:** A new Decision is locked.
- **Metric Signal:** A KPI breaches a defined threshold (e.g., Revenue drops 10%).
- **Temporal Event:** A specific time is reached (e.g., 08:00 AM Morning Briefing generation).

---

## 5. ACTION ARCHITECTURE

When a Trigger fires, the Automation Engine executes mechanical state changes.
**Action Catalog:**
- Spawn Task node in the Execution DAG.
- Assign Task to specific Agent.
- Synthesize Context Envelope for Agent prompt.
- Evaluate Agent Output syntax.
- Escalate to Human (Generate Notification).
- Lock Draft Output into Knowledge Vault.

---

## 6. APPROVAL ARCHITECTURE

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

## 7. WORKFLOW LIFECYCLE

The state machine for a permanent Workflow pipeline:
1. **Proposed**: Synthesized by KRISHNA based on repeating DAG patterns.
2. **Active**: Listening for Triggers.
3. **Paused**: Suspended (e.g., if a dependent API is down).
4. **Deprecated**: Retired because a governing Decision changed, rendering the Workflow obsolete.

---

## 8. WORKFLOW OWNERSHIP

- **Owner**: The System (KRISHNA).
- **Creator**: KRISHNA proposes based on Intelligence; Founder approves.
- **Modifier**: Changes automatically if a core Decision constraints it.
- **Retirement**: Governed by the Decision Registry. If a Decision dies, dependent workflows die with it.

---

## 9. AUTOMATION SAFETY MODEL

**Mistake Prevention**: All automated actions are sandboxed internally.
**Decision Constraints**: The Automation Engine cannot trigger an Action that violates a locked Decision. If a workflow attempts to do so, KRISHNA's Reasoning Engine severs the connection.
**Harmful Actions**: Prevented by the "Draft Model." Because Level 4 Autonomous Execution is heavily restricted, Agents cannot physically alter reality (e.g., spend money, send emails) without hitting a Level 3 Human Approval Gate.
**Rollback**: The system is an append-only ledger. Rollback is achieved by appending a "Revert State" node to the DAG.

---

## 10. HUMAN-IN-THE-LOOP MODEL

- **When humans MUST intervene**: Resolving Escalations, locking strategic Outputs, making capital decisions.
- **When humans SHOULD intervene**: Providing nuanced qualitative feedback when an Agent fails a Task twice.
- **When humans STAY OUT**: Mechanical routing, Agent model selection, API retry logic, and context assembly.

---

## 11. AGENT AUTOMATION MODEL

- **Participation**: Agents are the "leaf nodes" of a Workflow. The Workflow delivers the Context Envelope; the Agent returns a JSON payload.
- **Coordination**: Agents are oblivious to Workflows. They do not coordinate with other Agents. The Automation Engine acts as the absolute intermediary.
- **Failure**: If an Agent fails to return a valid payload, the Automation Engine triggers an auto-retry loop (Max 3). Upon final failure, it halts the Workflow branch and Escalates.

---

## 12. LEARNING WORKFLOW MODEL

- **Successful Workflows**: Pipelines that consistently run end-to-end with zero Founder rejections establish baseline velocity metrics.
- **Degraded Workflows**: If a Workflow constantly results in Rejected Outputs at Step 3, KRISHNA flags the Workflow as "Degraded" and recommends an architectural modification to the Founder (e.g., "Agent 3 lacks sufficient Decision constraints").

---

## 13. WORKFLOW INTELLIGENCE MODEL

- **Bottlenecks**: KRISHNA detects when a specific Node in a Workflow exceeds its median historical cycle time (e.g., "The Founder is taking 4 days to approve Step 2").
- **Optimization**: KRISHNA detects redundant steps (e.g., "Step 4 has been auto-approved 100% of the time for 3 months. Recommend shifting this step to Level 4 Autonomous Execution.").

---

## 14. AUTOMATION ENGINE ARCHITECTURE

**Purpose**: The background, high-concurrency event bus that listens for Triggers and executes Actions.
**Relationship with KRISHNA**: The Automation Engine is the mechanical muscle; KRISHNA's Reasoning Engine is the brain. The Automation Engine is completely unintelligent—it blindly executes the routing rules defined by KRISHNA.

---

## 15. V1 AUTOMATION BLUEPRINT

To prevent system collapse through hallucination or infinite loops, V1 imposes extreme safety constraints:

- **Fixed Level 3 Automation**: EVERY execution workflow in V1 ends in a Human Approval Gate. There is strictly ZERO Level 4 (Autonomous Execution) capability in V1.
- **Hardcoded Workflows Only**: V1 will not support dynamic, KRISHNA-generated workflows. It will operate entirely on rigid, hardcoded OS pipelines (Intent → Generate Task DAG → Assign Agent → Surface Output for Approval).
- **Internal Triggers Only**: Triggers are limited to internal OS state changes (e.g., Command received, Output approved). External webhooks (Zapier, email listeners) are deferred to V2.
