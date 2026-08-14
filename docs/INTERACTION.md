# EKVAAR OS — P2 HUMAN INTERACTION MODEL

## 1. PRIMARY INTERACTION MODEL

**Selected Model:** Command-first (via Conversation)

**Rationale:**
EKVAAR OS abandons the "hunting and gathering" model of traditional computing (App-first / Workspace-first), where users must navigate folders, open apps, and click buttons to perform an action. Instead, the OS is entirely Intent-Driven. 

The default behavior is the Founder declaring an intent ("Launch X", "Find Y", "Approve Z") via voice or text. The OS takes the command and dynamically renders the required Objects directly to the user. The Founder commands; the OS orchestrates.

---

## 2. KRISHNA INTERACTION MODEL

**When users interact with KRISHNA:**
- To generate intent (starting a new Mission or assigning a Task).
- To request complex synthesis ("Summarize the risks in these three Outputs").
- To navigate the system without hands (Voice).

**When users interact directly with objects:**
- Precision editing: Directly typing into a drafted *Output* (e.g., fine-tuning an email draft).
- Governance: Explicitly clicking "Approve" or "Reject" on a pending *Decision*.

**When KRISHNA takes over:**
- Background orchestration: Routing tasks to Agents, fetching context from the Knowledge Vault, and preparing the morning briefing.

**When KRISHNA stays invisible:**
- When the Founder is in a state of "Deep Work" (e.g., reading a long Knowledge node or interacting with a deep visualization). KRISHNA recedes to minimize cognitive load until summoned.

---

## 3. APPLICATION MODEL

In EKVAAR OS, traditional "Apps" (like a calculator, notes app, or task manager) are abolished. 

**What is an application?**
An application is strictly reserved for *high-density data visualization* or *deep-work manipulation* that natural language cannot efficiently handle. 
*Example:* A complex 3D supply-chain telemetry dashboard, or a rich-text canvas for editing code/graphics.

**What is NOT an application?**
Forms, to-do lists, simple text editors, calendars, and file browsers.

**Functions through KRISHNA only:**
Task assignment, status checks, meeting scheduling, note-taking, and querying metrics. These do not deserve apps; they are ephemeral widgets rendered instantly by KRISHNA.

---

## 4. SEARCH MODEL

**How search works:**
Search is a strict semantic and vector retrieval system across the Persistence Layer. 

**What search can access:**
It accesses locked *Knowledge*, *Decisions*, active *Projects*, and finalized *Outputs*. 

**How search differs from KRISHNA:**
- **Search** is *deterministic retrieval* ("Find the Q3 financial report"). It strictly returns the requested Object.
- **KRISHNA** is *generative action* ("Analyze the Q3 financial report and draft an investor update"). KRISHNA uses Search internally as a dependency.

---

## 5. WORKSPACE MODEL

**Why workspaces exist:**
Workspaces exist purely for **Context Bounding**. They filter out noise so the Founder only sees the Metrics and Missions relevant to their current cognitive focus.

**Model Type:** Contextual / Functional

**What belongs inside a workspace:**
A workspace does not contain "files". It contains a live view of active *Missions*, domain-specific *Metrics*, and pending *Decisions* bounded by context (e.g., the "Brand Workspace" only shows marketing metrics and branding tasks). 

---

## 6. NOTIFICATION MODEL

EKVAAR OS operates on a "Zero-Noise" philosophy.

**Deserves a notification:**
- Critical Blockers: An Agent requires Founder approval to execute a major *Decision*.
- Telemetry Alerts: A *Metric* crosses a critical threshold (e.g., Server downtime, revenue drop).
- Mission Failure: An entire *Project* is fundamentally blocked.

**Never triggers a notification:**
- Task start/stop events by Agents.
- Minor *Knowledge* index updates.
- Agent scratchpad reasoning steps.

**Silently processed:**
Agent routing, successful task handoffs, and background research are logged in the Event System but never pushed to the Founder's screen.

---

## 7. MEETING MODEL

**When meetings are required:**
Complex, high-bandwidth strategic alignment involving human nuance, creative brainstorming, or emotional leadership that Agents cannot replicate.

**When meetings should be replaced:**
Status updates, metric reviews, and basic information sharing are eliminated. These are replaced by KRISHNA briefings.

**How meeting outputs convert:**
1. Audio is transcribed automatically.
2. The Context Engine extracts context into *Knowledge*.
3. The Engine extracts locked choices into the *Decision Registry*.
4. The Planning Engine extracts action items into *Tasks* and routes them to Agents.

---

## 8. VOICE MODEL

**When Voice is superior:**
- Rapid intent capture (walking, driving).
- Complex stream-of-consciousness "brain dumps" where typing limits thought velocity.

**When Text is superior:**
- Precision editing of a finalized *Output*.
- Environments where speaking is restricted.
- Reviewing complex numerical *Metrics*.

**When KRISHNA proactively speaks:**
- The Morning Briefing.
- High-priority operational alerts ("Founder, revenue has dropped 20% in the last hour").

**When KRISHNA remains silent:**
- Acknowledging simple, low-stakes text commands.
- Rendering massive text outputs that are better read than heard.

---

## 9. AUTOMATION MODEL

**What happens automatically:**
Context retrieval, Agent routing, Task assignment, and Knowledge indexing.

**What requires approval:**
Finalizing an *Output* intended for the external world (e.g., publishing a tweet, sending an email to investors, committing code to production).

**What requires Founder approval:**
Locking a *Decision* that alters governance, shifting capital, or fundamentally changing the parameters of a *Mission*.

**What KRISHNA executes independently:**
Spawning sub-Agents, retrying failed Agent tasks, summarizing external data, and reorganizing memory.

---

## 10. FOUNDER OPERATING RHYTHM

The ideal daily operating rhythm in EKVAAR OS:

- **Morning (Alignment):** Founder opens the OS. KRISHNA proactively speaks the Morning Briefing. Founder reviews blocked *Decisions* and approves *Outputs* generated overnight by Agents.
- **Midday (Deep Work):** Founder works on strategic *Missions*. Uses command-first Voice/Text to rapidly delegate new *Tasks* to Agents as thoughts arise.
- **Evening (Brain Dump):** Founder speaks a stream-of-consciousness summary of the day. KRISHNA silently parses this into *Knowledge* and queues up new *Tasks* for overnight Agent execution.
- **Weekly Review:** Founder shifts to the Telemetry App to review high-density *Metrics* and overall *Mission* health.
- **Monthly Review:** Founder locks new strategic *Decisions* and recalibrates Agent constraints.

---

## 11. INTERACTION HIERARCHY

When navigating the OS, users should rely on interfaces in this strict order:

1. **KRISHNA** (The primary generative router for all intent)
2. **Commands** (Direct text/keyboard shortcuts for rapid execution)
3. **Search** (Deterministic retrieval of locked objects)
4. **Notifications** (Surfacing critical, un-ignorable blockers)
5. **Workspaces** (Filtering cognitive context for deep work)
6. **Applications** (Rare, deep-dive manipulation of dense data)
7. **Meetings** (The absolute last resort for human-to-human alignment)
