# EKVAAR OS — P8 MISSION & EXECUTION ARCHITECTURE

## 1. MISSION DEFINITION

**Definition:** A macro-strategic objective that fundamentally shifts the trajectory of the enterprise. It spans multiple domains and requires sustained effort over months or years.
**Qualifies:** "Reach ₹100 Cr Revenue", "Launch EKVAAR Luxe House", "Establish North American Supply Chain".
**Does Not Qualify:** "Fix website checkout bug", "Hire a new designer", "Run summer sale".

---

## 2. INITIATIVE DEFINITION

**Definition:** A massive, domain-specific thrust of effort required to achieve a portion of a Mission.
**How they differ from Missions:** Missions are cross-functional. Initiatives are bounded by a specific Domain (e.g., Marketing, Finance).
**Creation:** Automatically derived by KRISHNA's Planning Engine by breaking down the Mission.
**Relationship:** A Mission is the sum total of its Initiatives.

---

## 3. PROJECT DEFINITION

**Definition:** A bounded, time-constrained container for Tasks that yields a specific milestone.
**How they differ from Initiatives:** Initiatives are continuous streams of effort. Projects have a definitive start and end state (e.g., "Shoot Summer Lookbook").
**Grouping:** Projects belong exclusively to one Initiative.
**Tracking:** Tracked purely by milestone completion, not by daily task velocity.

---

## 4. TASK DEFINITION

**Definition:** The atomic unit of execution. A single, discrete instruction given to a single Agent (or Person) that produces exactly one Output.
**Granularity:** Highly granular. A Task must be executable in a single continuous session by an Agent without requiring intermediate decisions from the Founder. If it requires back-and-forth, it is a Project, not a Task.
**Ownership:** Owned strictly by the executing Agent.

---

## 5. OUTPUT DEFINITION

**Definition:** The tangible, immutable deliverable produced by a Task.
**Model:** An Output is always a "Draft" until explicitly "Approved". 
**Qualifies:** A markdown document, an email draft, a synthesized research report, an API payload, a design file.
**Role:** Once Approved, an Output becomes locked Knowledge and acts as the input for dependent Tasks in the DAG.

---

## 6. INTENT → EXECUTION PIPELINE

**Example: Founder says "Launch EKVAAR Luxe."**

1. **Intent:** Captured by Interaction Layer.
2. **Mission:** KRISHNA parses the goal and creates the `Mission: Launch EKVAAR Luxe`.
3. **Initiative:** KRISHNA spawns `Marketing Initiative`, `Design Initiative`, `Supply Chain Initiative`.
4. **Projects:** Within Marketing, KRISHNA creates `Project: Brand Identity Assets`.
5. **Tasks:** KRISHNA assigns `Task: Draft Luxe Brand Manifesto` to the Copywriter Agent.
6. **Outputs:** Agent generates the markdown text.
7. **Review:** KRISHNA surfaces the Output widget to the Founder on the Desktop. Founder clicks Approve.
8. **Completion:** The Manifesto becomes locked Knowledge. The next Task (Design Logo based on Manifesto) is automatically unblocked.

---

## 7. PLANNING ARCHITECTURE

**Who Plans:** **KRISHNA (Planning Engine)**.
Humans only provide Intent. Agents only execute Tasks. KRISHNA handles all intermediate translation.
**How Plans are Created:** By referencing past company Knowledge and locked Decisions to infer what Projects are necessary for the Mission.
**How Plans are Approved:** The Founder explicitly approves the Mission and top-level Initiatives. KRISHNA auto-generates and auto-adjusts Projects and Tasks dynamically.

---

## 8. EXECUTION ARCHITECTURE

**How Execution Begins:** The moment the Founder approves the top-level plan, KRISHNA instantly routes the first unblocked leaf-node Task to an Agent.
**How Execution is Monitored:** KRISHNA monitors token limits, API timeouts, and output syntax validity in the background.
**How Blockers are Handled:** If a Task is blocked (e.g., missing context), execution halts on that specific branch, and KRISHNA shifts compute resources to other unblocked Initiatives while notifying the Founder.
**How Failures are Handled:** Agent failures trigger up to 3 automatic retries with shifted constraints. After 3 failures, KRISHNA escalates.

---

## 9. REVIEW ARCHITECTURE

**How Outputs are Reviewed:** Via transient visual widgets (P4) that pop up in the Desktop environment.
**Who Reviews:** The Founder. Agents never review final strategic Outputs.
**How Quality is Measured:** By the Output's strict adherence to the initial Task constraints and the rules in the Decision Registry.
**Approval:** Locks the Output, converting it to Knowledge.
**Rejection:** The Founder provides a correction. KRISHNA generates a "Negative Constraint" Knowledge Node (P6) and respawns the Task.

---

## 10. COMPLETION ARCHITECTURE

The execution engine follows strict hierarchical resolution:
- **Task Complete:** When its Output is Approved.
- **Project Complete:** When all child Tasks are Complete.
- **Initiative Complete:** When all child Projects are Complete.
- **Mission Complete:** When all child Initiatives are Complete *AND* the defining Telemetry Metric (e.g., Revenue hits target) is verified.

---

## 11. METRIC ARCHITECTURE

Execution health is measured by five specific OS metrics:
1. **Mission Progress:** Ratio of completed child nodes vs total DAG nodes.
2. **Task Completion:** Binary state (Done / Not Done).
3. **Output Quality:** The ratio of Approved vs Rejected iterations per Agent.
4. **Cycle Time:** The total duration from Intent generation to Output approval.
5. **Execution Velocity:** Number of Tasks successfully routed and completed by the Agent swarm per hour.

---

## 12. ESCALATION ARCHITECTURE

**When KRISHNA Escales:**
- A Decision conflict is detected.
- An Agent fails the same Task 3 times.
- A critical Telemetry boundary (budget limit) is approached.
**Who Receives Escalations:** The Founder (via Critical Notifications, bypassing Focus Mode).
**How Priorities are Handled:** A critical escalation immediately pauses all dependent downstream work in the DAG until the Founder resolves the blocker.

---

## 13. DEPENDENCY ARCHITECTURE

**How Dependencies are Tracked:** As directed edges in the Execution DAG. 
*Rule:* Task B cannot be routed to an Agent until Task A's Output is Approved and injected directly into Task B's Context envelope.
**Critical Path:** KRISHNA calculates the longest unbroken chain of dependencies in a Mission.
**Execution Risk:** Measured by how many downstream Tasks rely on a currently blocked node.

---

## 14. MISSION CONTROL ARCHITECTURE

*(Note: As defined in P3 and P4, Mission Control is an Application, not a dashboard or a Gantt chart.)*
**Purpose:** A diagnostic visualization tool.
**Role:** It allows the Founder to visually oversee the autonomous workforce by mapping the Execution DAG.
**Outputs:** It visually renders the node graph, immediately highlighting the red (escalated) bottlenecks that are preventing company execution.

---

## 15. V1 MISSION BLUEPRINT

To prevent the OS from devolving into bloated enterprise project management software, Version 1 will be ruthlessly pruned:

- **Simplified Hierarchy**: V1 will completely skip `Initiative` and `Project` objects. The hierarchy will be strictly **Mission → Task → Output**.
- **1-Level DAG**: The Planning Engine will only generate single-layer graphs.
- **Manual Review**: Every single Output must be manually approved by the Founder. (Agent auto-approval is deferred to V2).
- **Binary Escalation**: Complex retry logic is disabled. If an Agent fails a Task, it immediately halts and escalates to the Founder. 
- **No Critical Path Math**: V1 will not calculate execution risk or critical paths. It will simply execute whatever Task is currently unblocked.
