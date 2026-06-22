# EKVAAR OS — P3 APPLICATION ARCHITECTURE

## 1. COMPLETE CANDIDATE APPLICATION LIST

To determine the ideal suite, we evaluate every traditional OS application candidate:
- Mission Control (Strategy/Execution overview)
- Knowledge Vault (File system / Wiki replacement)
- Telemetry / Analytics (Metrics dashboard)
- Agent Network (Managing AI workers)
- Communications (Email/Chat wrapper)
- Notes / Whiteboard (Drafting)
- Calendar (Time management)
- Decision Registry (Ledger)
- Terminal / Code Editor (Deep work)
- App Store (3rd party extensions)
- Task Manager / Kanban (Ticket tracking)
- Search

---

## 2. CORE APPLICATIONS

These are strictly required for Version 1. The OS cannot function without them because they represent "Deep Work" environments where high-density data cannot be effectively consumed via voice or conversational chat alone.

**Ranked by Importance:**
1. **Knowledge Vault**: The definitive interface for deep reading, precision editing, and visualizing the relationships between stored company memory, decisions, and approved outputs.
2. **Telemetry**: A high-density dashboard for data visualization. While KRISHNA can summarize a metric ("Revenue is up 5%"), Founders require charts, trendlines, and spatial data to understand deep operational health.
3. **Mission Control**: A high-altitude graph visualization of the entire execution DAG (Missions → Projects → Tasks). Needed when the Founder needs to visually map bottlenecks across the entire company.

---

## 3. SUPPORTING APPLICATIONS

These are valuable, but non-essential for V1. They can be added later.
- **Agent Network**: A visualization tool for monitoring Agent parameters, performance, and swarm interactions. (In V1, KRISHNA handles the single Agent silently).
- **Deep Canvas (IDE/Editor)**: A specialized environment for manipulating massive Outputs (e.g., editing a 5,000-line codebase or designing a graphic).
- **Virtual HQ**: A spatial presence map for visualizing human/agent location and status.

---

## 4. APPLICATIONS TO REJECT

These applications violate the foundational philosophy of EKVAAR OS and are strictly banned.

- **Notes App**: Ephemeral thoughts and meetings should be spoken to KRISHNA and automatically parsed into the *Knowledge Vault*. A standalone Notes app creates data silos.
- **Task Manager / Kanban Board**: The OS manages routing dynamically. The Founder does not drag tickets; they approve *Outputs*.
- **Calendar App**: Time is abstracted in an autonomous OS. Agents work asynchronously; scheduling is a constraint handled by KRISHNA, not a visual grid for the Founder to manage.
- **Communications (Email/Chat)**: Internal chat is useless since Agents don't need Slack. External communication is simply an *Output* object that an Agent pushes to an external API (like an SMTP server).
- **App Store**: EKVAAR OS is a coherent, closed ecosystem. Third-party UI plugins break the conversational interaction model.

---

## 5. APPLICATION SPECIFICATIONS

### A. Knowledge Vault
- **Purpose**: Deep exploration and precision editing of the company's source of truth.
- **Primary Users**: Founder, Leadership.
- **Owned Objects**: Knowledge, Decision, Output.
- **Inputs**: Approved Outputs, external document ingests via KRISHNA.
- **Outputs**: Verified, edited context nodes.
- **Dependencies**: Persistence Layer (Vector DB).
- **Success Criteria**: A user can locate any historical decision or finalized output in under 3 seconds and edit it with zero formatting friction.

### B. Telemetry
- **Purpose**: High-density visualization of the operational, financial, and product health of the company.
- **Primary Users**: Founder.
- **Owned Objects**: Metric.
- **Inputs**: System events, external API streams (Stripe, GitHub, etc.).
- **Outputs**: Time-series graphs, heatmaps, and health scorecards.
- **Dependencies**: Metrics Engine.
- **Success Criteria**: The Founder can glance at the screen and instantly identify the primary growth bottleneck without reading a single paragraph.

### C. Mission Control
- **Purpose**: To provide a strategic, high-altitude visualization of the execution flow.
- **Primary Users**: Founder.
- **Owned Objects**: Mission, Initiative, Project, Task.
- **Inputs**: Execution State Engine events.
- **Outputs**: Directed acyclic graph (DAG) visualizations showing blocked nodes.
- **Dependencies**: Planning Engine.
- **Success Criteria**: The Founder can visually identify exactly which Agent is blocking a Mission and why.

---

## 6. APPLICATION DEPENDENCY MAP

Applications do not own data; they merely visualize the Object Layer.

- **Mission Control** → Reads: `Mission`, `Initiative`, `Project`, `Task`. Writes: `Decision` (Unblocking).
- **Knowledge Vault** → Reads: `Knowledge`, `Output`, `Decision`. Writes: `Knowledge`.
- **Telemetry** → Reads: `Metric`. Writes: None.

---

## 7. DOCK STRATEGY

EKVAAR OS utilizes a minimal intervention strategy. The traditional "Dock" of 20+ apps is abolished.

- **Always In Dock**: Telemetry, Mission Control, Knowledge Vault.
- **Optional Dock**: Agent Network, Deep Canvas (Post-V1).
- **Launchpad Only**: Deprecated (The Launchpad is abolished in favor of KRISHNA).
- **Hidden System Application**: Decision Registry (Accessible only via KRISHNA command or Knowledge Vault inspection).

---

## 8. SYSTEM SERVICES VS APPLICATIONS

Some features masquerade as apps but must be pushed down to the OS architecture.

- **Search**: Should Search be an app? **No.** Search is a universal *System Service*. It does not have an app window; it is a global overlay invoked via a shortcut or implicitly by KRISHNA.
- **Decision Registry**: Should it be an app? **No.** It is an immutable backend ledger. The Founder accesses decisions by asking KRISHNA or viewing them contextually within the Knowledge Vault.
- **Task Assignment**: **No.** It is a core Kernel execution routing service.

---

## 9. KRISHNA BOUNDARY DEFINITION

Capabilities that belong strictly inside the KRISHNA Kernel, explicitly preventing them from becoming standalone UI applications:

- **Reasoning**: KRISHNA's core loop.
- **Planning**: Breaking a Mission into Tasks. (Mission Control *visualizes* it, KRISHNA *does* it).
- **Summarization**: Generating a TL;DR of an Output.
- **Task Creation**: Parsing a Founder's voice intent into a Task object.

These are KRISHNA capabilities, not applications. A Founder will never open a "Summarization App" or a "Task Creator App."

---

## 10. FINAL V1 APPLICATION SET

Being absolutely ruthless to prevent UI bloat, Version 1 of EKVAAR OS will launch with exactly **THREE** applications:

1. **Telemetry** (To visualize the numbers)
2. **Knowledge Vault** (To read and edit the words)
3. **Mission Control** (To oversee the execution)

Everything else is stripped. If a Founder wants to take a note, schedule an event, or assign a task, they speak to KRISHNA. The three remaining applications only exist because visualizing massive graphs, reading long-form text, and manipulating charts cannot be effectively accomplished through a chat or voice interface.
