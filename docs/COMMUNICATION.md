# EKVAAR OS — P11 COMMUNICATION ARCHITECTURE

## 1. COMMUNICATION DEFINITION

**Definition:** Communication in EKVAAR OS is the explicit transfer of Intent, Context, or Output between nodes (Human, Agent, System) designed strictly to drive execution or update Company Knowledge.
**What it is NOT:** Casual chat, water-cooler banter, or unstructured brainstorming.
**Official Definition:** Information flow engineered for deterministic execution.

---

## 2. COMMUNICATION TYPES

To prevent information sprawl, all communication is strictly typed:
- **Command:** A direct, executable instruction from Founder to KRISHNA.
- **Briefing:** A proactive, synthesized system update from KRISHNA to Founder.
- **Escalation:** A system-generated alert indicating a blocked execution path.
- **Context Injection:** Bounded data passed silently from KRISHNA to an Agent.
- **Output Submission:** A tangible deliverable passed from an Agent back to KRISHNA.
- **Decision Broadcast:** A system-wide update modifying the rules of execution.

---

## 3. CONVERSATION ARCHITECTURE

**What it is:** A transient, stateful session of Commands and Briefings.
**Ownership:** Owned by the currently active Workspace or Mission.
**Storage:** Stored temporarily in "Conversational Memory" (RAM).
**Memory Conversion:** When a conversation yields an actionable Output or a new Decision, KRISHNA extracts that specific node, locks it into the Knowledge Vault, and immediately discards the rest of the conversational wrapper to prevent vector database bloat.

---

## 4. COMMUNICATION CHANNELS

- **Founder ↔ KRISHNA:** The primary, high-bandwidth UI channel (Voice/Text on the Desktop).
- **KRISHNA ↔ Agent:** Background API/JSON channel. Totally invisible.
- **Agent ↔ Agent:** Non-existent. Agents do not negotiate with each other. KRISHNA acts as the centralized router.
- **System ↔ External Entity:** Automated, finalized handoffs (e.g., emailing a finalized PDF tech pack to a vendor).

---

## 5. MEETING ARCHITECTURE

**Definition:** Synchronous time blocked for high-density Decision-making or Intent generation.
**When they occur:** Only when a Decision requires multi-variable nuance that asynchronous Commands cannot efficiently resolve.
**Value Creation:** Meetings are recorded. KRISHNA extracts the transcript, synthesizes the core Decisions, spawns the resulting Tasks, and then discards the raw audio to preserve a high signal-to-noise ratio in the Knowledge Vault.

---

## 6. VOICE ARCHITECTURE

**When Preferred:** High-velocity Intent generation (e.g., Morning strategic direction, Evening brain dumps while commuting).
**When Text is Preferred:** Precision editing of Agent Outputs or reading complex data (Telemetry/Knowledge Vault).
**Knowledge Pipeline:** Voice is instantly transcribed, parsed by the Intent Engine, stripped of conversational filler, and converted into structured Commands or Knowledge Nodes.

---

## 7. NOTIFICATION ARCHITECTURE

Notifications are an attack on Founder focus. They are ruthlessly tiered:
1. **Interruption (Critical):** Bypasses Focus Mode. Requires immediate action. Examples: Blocked Level 1 Decision, major Metric failure (e.g., website down).
2. **Awareness (Standard):** Silent UI badges. Examples: Agent Output ready for review, non-critical task completion.
3. **Silence (Suppressed):** Background Agent loops, routine Knowledge indexing, successful API calls.

---

## 8. COMMUNICATION MEMORY MODEL

- **Retained (Permanent):** Approved Outputs, Locked Decisions.
- **Summarized:** Meeting transcripts (distilled into actionable Facts and Tasks).
- **Archived/Forgotten:** Raw conversational logs, Agent reasoning scratchpads, temporary chat interfaces. 

---

## 9. AGENT COMMUNICATION MODEL

**How Agents communicate:** Strictly via structured JSON schemas passed back and forth to KRISHNA.
**Coordination:** Agents cannot talk to each other. If the Copywriter Agent needs information from the Research Agent, it must return an Output to KRISHNA, and KRISHNA decides if and how to inject that Output into the next Agent's prompt.
**Escalation:** If an Agent cannot parse its prompt or hits an API failure, it returns an error code to KRISHNA, triggering an automatic retry or a Founder escalation.

---

## 10. KRISHNA COMMUNICATION MODEL

**When KRISHNA speaks:** During the proactive Morning Briefing to align the day's execution.
**When KRISHNA recommends:** When a blocked Execution DAG shows a clear, repeating pattern (e.g., "Agents fail at Task X frequently; recommend creating a new SOP").
**When KRISHNA escalates:** When Level 1-3 Decisions collide and the system cannot resolve the logical paradox.
**When KRISHNA is silent:** During successful background task routing and execution.

---

## 11. ORGANIZATIONAL COMMUNICATION MODEL

Because EKVAAR OS is the company, traditional "all-hands emails" or "memos" are obsolete. 
When a major Strategic Decision is made or a Mission completes, KRISHNA simply injects the summary into the Morning Briefing. System state changes *are* the communication.

---

## 12. COMMUNICATION INTELLIGENCE

**Analysis:** KRISHNA parses all Founder communication not just for the literal command, but for implicit constraints (e.g., tone preferences, urgency).
**Blocker Detection:** Detected by measuring the cycle time of an interaction. If KRISHNA and the Founder are going back-and-forth 10 times on a single Task, KRISHNA flags the Task as "Misaligned" and requests a formal Decision to clarify the ambiguity.

---

## 13. COMMUNICATION PERMISSIONS

- **Who communicates with whom:** The Founder communicates with KRISHNA. KRISHNA communicates with Agents.
- **Restrictions:** Agents are strictly barred from initiating communication with the Founder directly. An Agent must return its Output to KRISHNA, which KRISHNA surfaces on the Desktop widget.
- **External Entities:** External vendors communicate via standardized forms/emails that KRISHNA ingests. They do not have conversational access to the OS.

---

## 14. COMMUNICATIONS APPLICATION ARCHITECTURE

**Purpose:** There is no "Chat App" (e.g., Slack or Teams) in EKVAAR OS.
**Relationship:** The OS *itself* is the communication layer. The central KRISHNA interface on the blank Desktop replaces all messaging apps.

---

## 15. V1 COMMUNICATION BLUEPRINT

To prevent enterprise messaging bloat, Version 1 imposes these strict limits:

- **Single Channel**: Founder ↔ KRISHNA text/voice interface.
- **No Human Messaging**: Since V1 assumes a single Founder, there is zero human-to-human messaging architecture built into the OS.
- **No Automated Meeting Extraction**: Audio transcription and synthesis are deferred. V1 relies on the Founder explicitly typing or speaking Commands.
- **Binary Notifications**: Either a Critical Popup that pauses the screen, or complete silence. No complex notification centers or feeds.
