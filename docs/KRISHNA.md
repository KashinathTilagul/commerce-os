# EKVAAR OS — P5 KRISHNA KERNEL ARCHITECTURE

## 1. PURPOSE

**Why KRISHNA exists:**
KRISHNA exists to eliminate the friction between Founder strategy and machine execution. It acts as the intelligent router that parses ambiguous human language and translates it into strict, deterministic operational execution.

**Exclusive Responsibilities:**
- Intent Parsing (translating human language to machine commands).
- Execution Planning (generating the DAG of Missions → Tasks).
- Agent Orchestration (routing tasks to digital workers).
- Context Injection (ensuring agents have the right Knowledge).

**Never belongs to KRISHNA:**
- Autonomous strategic decision-making (changing company direction without approval).
- Direct capital expenditure.
- Direct code deployment to production.

---

## 2. SUBSYSTEM ARCHITECTURE

KRISHNA operates strictly through independent, concurrent subsystems:

1. **Intent Engine**
   - *Purpose*: Parses raw text/audio into a structured `Command`.
   - *Inputs*: Voice/Text. *Outputs*: `CommandObject`. *Dependencies*: None.
2. **Context Engine**
   - *Purpose*: Enriches the Command with relevant company memory.
   - *Inputs*: `CommandObject`. *Outputs*: `EnrichedCommand`. *Dependencies*: Knowledge Vault.
3. **Reasoning Engine**
   - *Purpose*: Evaluates if the `EnrichedCommand` is logically sound and constraint-compliant.
   - *Inputs*: `EnrichedCommand`. *Outputs*: `ValidatedCommand` or `EscalationAlert`. *Dependencies*: Decision Registry.
4. **Planning Engine**
   - *Purpose*: Generates the Execution DAG (Directed Acyclic Graph).
   - *Inputs*: `ValidatedCommand`. *Outputs*: Unassigned `Task` graph. *Dependencies*: Execution State Engine.
5. **Agent Coordinator**
   - *Purpose*: Matches Tasks to specialized Agents and handles handoffs.
   - *Inputs*: Unassigned `Task`. *Outputs*: Active Agent Executions. *Dependencies*: Entity Directory.
6. **Memory Engine**
   - *Purpose*: Translates finalized Outputs into long-term company memory.
   - *Inputs*: Approved `Output`. *Outputs*: Indexed vector nodes. *Dependencies*: Knowledge Vault.

---

## 3. MEMORY ARCHITECTURE

**What gets remembered:** Approved Outputs, Locked Decisions, Verified Metrics, Resolved Tasks.
**What does not:** Conversational pleasantries, aborted task logs, intermediate agent scratchpad reasoning.

**How memory differs:**
- *Conversational Memory* is short-term (RAM). It clears when the current task/context window closes.
- *Company Knowledge* is long-term (Disk). It is systematically written to the Knowledge Vault.

**Evolution:**
Memory evolves via explicit overwrite or semantic weighting. Newer approved Outputs hold heavier semantic weight than older ones unless constrained by an immutable Decision.

---

## 4. REASONING ARCHITECTURE

When a Founder commands KRISHNA, the reasoning workflow is:

1. **Analyze**: Deconstruct the grammar and core intent.
2. **Research**: Query the Context Engine to retrieve rules, constraints, and past context.
3. **Plan**: Formulate the optimal path to execute the intent (The DAG).
4. **Escalate**: If the plan requires violating a known Constraint or exceeds Authority bounds, halt and ask the Founder.
5. **Execute**: If safe, hand off to the Planning Engine.

---

## 5. PLANNING ARCHITECTURE

**Example: Founder says "Launch EKVAAR Luxe Collection."**

KRISHNA recursively breaks down intent until it hits executable leaf nodes:
- **Mission**: Launch EKVAAR Luxe (Owner: Founder)
  - **Initiative**: Marketing (Owner: KRISHNA)
    - **Project**: Social Assets (Owner: KRISHNA)
      - **Task**: Draft Instagram Ad Copy (Owner: Copywriter Agent)
        - **Output**: Markdown copy text (Deadline: EOD).

If a Task is too complex for an Agent, KRISHNA recursively splits it into smaller Tasks.

---

## 6. EXECUTION ARCHITECTURE

**What KRISHNA executes automatically:**
Generating task graphs, routing tasks to Agents, retrieving semantic search queries, reorganizing memory.

**What requires approval:**
Finalizing an Agent's *Output* (e.g., an Agent writes an email; Founder must approve before it is "final").

**What requires Founder approval:**
Locking a *Decision* (e.g., defining a new brand guideline or budget).

**What requires human execution:**
Physical-world tasks or highly nuanced creative final-polish that Agents fail to resolve after 3 iterations.

---

## 7. AGENT ARCHITECTURE

KRISHNA acts as the Manager; Agents are the Workers.

- **Assigns:** KRISHNA packages the Task + Context + Constraints into a secure envelope and passes it to the Agent.
- **Monitors:** KRISHNA tracks timeout loops and token-generation limits.
- **Evaluates:** KRISHNA's Reasoning Engine checks the Agent's Output against the original Task parameters before presenting it to the Founder.
- **Replaces:** If an Agent fails the evaluation 3 times, KRISHNA kills the process, re-assigns a different generalized model, or escalates to the Founder as a blocked node.

---

## 8. DECISION ARCHITECTURE

**How decisions are proposed:** By Founder declaration ("Make it a rule that...") or Agent discovery ("We failed this task 3 times, should we change the parameter?").
**How evaluated:** KRISHNA checks if the new decision conflicts with existing decisions.
**How approved:** Explicit binary confirmation by the Founder.
**How permanent:** The decision is hashed, timestamped, and appended to the immutable *Decision Registry*.

---

## 9. SEARCH ARCHITECTURE

**Search vs. Reasoning:**
- *Search* is deterministic semantic retrieval (finding the exact node in the Vector DB).
- *Reasoning* is generative synthesis (reading the retrieved nodes and creating a new Output).

KRISHNA uses Search internally as a tool, but Search itself is a pure database query across Knowledge, Decisions, and Outputs without LLM hallucination.

---

## 10. COMMUNICATION ARCHITECTURE

**Speak:** Proactive Morning Briefings.
**Silent:** Successful background task routing, minor knowledge indexing.
**Proactively Notify:** Metric drops, Agent failures blocking a Mission.
**Interrupt:** Destructive actions detected (e.g., "Warning: This action deletes the primary knowledge node for Finance").
**Escalate:** When the Agent swarm exhausts its retry limits and is fundamentally stuck.

---

## 11. LEARNING ARCHITECTURE

**How KRISHNA improves:**
By analyzing Founder rejections. When a Founder rejects an *Output* and provides a correction, KRISHNA's Memory Engine logs the delta as a "Negative Constraint."

**Preferences:**
Founder and Company preferences are not implicitly guessed; they are explicitly extracted from approved outputs and stored in the Decision Registry. KRISHNA avoids repeating mistakes by injecting Negative Constraints directly into the Context Engine for future Agents.

---

## 12. OPERATING MODES

KRISHNA shifts between strict computational states to conserve resources:

- **Passive Mode**: Listening for wake word / `CMD+Space`. Lowest resource usage.
- **Command Mode**: Rapid, synchronous execution of simple retrieval tasks.
- **Planning Mode**: High-compute generation of Execution DAGs.
- **Execution Mode**: Background orchestration of Agent swarms.
- **Review Mode**: Suspending background work to focus the UI entirely on a Founder Output Approval interaction.

---

## 13. AUTHORITY MODEL

- **KRISHNA Can Decide**: Internal task routing, context weighting, agent selection.
- **KRISHNA Can Recommend**: Strategic pivots based on Telemetry, identifying redundant tasks.
- **KRISHNA Can Execute**: Read/Write to the internal Knowledge Vault, draft generation.
- **KRISHNA Must Escalate**: Capital movement, policy changes, hiring/firing agents, external API publishing (sending emails).
- **KRISHNA Can NEVER Do**: Overwrite a locked Decision without explicit Founder override.

---

## 14. SUCCESS METRICS

How we evaluate if the Kernel is functioning correctly:

1. **Founder Time Saved**: Measured by the delta between Intent Capture and Final Output generation.
2. **Output Rejection Rate**: The percentage of Agent outputs the Founder rejects. (Goal: < 5%).
3. **Execution Latency**: Time taken for the Planning Engine to convert an Intent into an assigned Task.

---

## 15. V1 KRISHNA BLUEPRINT

To prevent feature bloat and AGI-hallucination, Version 1 of KRISHNA will be severely constrained:

- **Subsystems**: Only the Intent Engine, Planning Engine (limited to 1-level deep: Intent → Task → Output), and Memory Engine.
- **Agents**: A single, generalized background Agent. Complex swarm coordination is excluded.
- **Learning**: Zero implicit ML training. Learning is strictly explicit (saving rules to the Knowledge Vault).
- **Authority**: Strictly sandboxed to internal Read/Write. Zero external API execution (cannot send real emails, move money, or post to social media).
