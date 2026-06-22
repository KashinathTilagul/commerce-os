# EKVAAR OS — D3 NAVIGATION & USER FLOW ARCHITECTURE

*(Note: This specification bridges P17 Desktop UX and D2 Screen Architecture, defining the exact sequences and commands the Founder uses to move through the OS).*

## 1. NAVIGATION PHILOSOPHY

EKVAAR OS is strictly **Command-First**.
- **Why**: Graphical navigation (clicking through 5 layers of folders) is too slow for an executive interface. 
- **The Paradigm**: You do not "go" to information. You command the OS, and the OS brings the information to you. If you know exactly what you want, you type it. If you need to reason about it, you ask KRISHNA.

---

## 2. NAVIGATION LAYERS

The hierarchy of how information is summoned:
1. **Layer 1: The Command Palette (`CMD+K`)**: Deterministic, instant teleportation to any exact Object ID or OS action.
2. **Layer 2: The KRISHNA Overlay (`CMD+Space`)**: Generative, conversational routing.
3. **Layer 3: Root Applications**: The physical 100% full-screen interfaces (Mission Control, Knowledge Vault, Telemetry).
4. **Layer 4: Context Modals**: Deep-dive overlays (e.g., Task Output View) triggered from Layer 3.

---

## 3. ENTRY POINT ARCHITECTURE

How the Founder initiates a workflow:
- **Global Hotkeys**: `CMD+K` and `CMD+Space` are the primary entry points, available instantly over any screen.
- **The Hidden Dock**: A secondary, physical failsafe containing only 3 icons (Telemetry, Vault, Mission Control).
- **Critical Notifications**: Clicking a red system toast instantly opens the associated Blocked Task or Metric Signal.

---

## 4. OBJECT NAVIGATION MODEL

You navigate the graph relationally, without losing visual context.
- **Mission → Task**: In Mission Control, clicking a Mission opens its DAG tree. Clicking a Task opens the Task Context Modal.
- **Task → Decision**: Inside the Task Modal, clicking a cited Decision ID opens a Knowledge Vault Modal *over* the Task Modal. When dismissed, you are still inside the Task.
- **Metric → Mission**: In Telemetry, clicking an anomalous metric (e.g., High Return Rate) offers a 1-click prompt to KRISHNA to generate an investigative Mission.

---

## 5. FOUNDER FLOW ARCHITECTURE

**The Approval Workflow (Primary V1 Flow)**:
1. **Entry**: Open Mission Control.
2. **Locate**: View the "Pending Approvals" queue.
3. **Inspect**: Click a Draft Output. The Modal opens.
4. **Decide**: The Founder reads the Agent's generated markdown.
5. **Act**: The Founder clicks `[Approve]` or `[Reject]`.
6. **Result**: The Modal closes, the Task advances in the DAG, and the next item in the queue is highlighted.

---

## 6. AGENT FLOW ARCHITECTURE

The Founder does not navigate "into" an Agent. Agents are tools.
- **Assign Flow**: In Mission Control → Select Task → Type Agent Class (e.g., "Copywriter") → Hit Enter.
- **Escalation Flow**: KRISHNA Notification: "Agent Failed x3" → Founder clicks Notification → Task Modal opens showing Agent constraints → Founder rewrites constraint → Clicks `[Retry]`.

---

## 7. KNOWLEDGE FLOW ARCHITECTURE

- **Create**: `CMD+K` → Type `>New Decision` → Vault Editor opens Full-Screen → Founder types markdown → Clicks `[Lock]`.
- **Reference**: While reviewing a Task Output, Founder types `CMD+Space` → *"KRISHNA, does this output violate our Brand Tone Decision?"* → KRISHNA analyzes and replies instantly.

---

## 8. MISSION FLOW ARCHITECTURE

- **Create**: Founder types `CMD+Space` → *"KRISHNA, draft a Mission to launch the Summer Campaign."*
- **Review**: KRISHNA generates the DAG tree in the KRISHNA Modal.
- **Execute**: Founder clicks `[Approve DAG]`. KRISHNA automatically routes the DAG into Mission Control and assigns the first tier of Tasks to Agents.

---

## 9. DECISION FLOW ARCHITECTURE

- **Review**: `CMD+K` → Type `D-402` (Decision ID). The read-only Knowledge Vault overlay appears.
- **Modify**: Decisions cannot be edited. The Founder clicks `[Supersede]`. A 50/50 split-view editor opens. The old Decision is on the left; the new draft is on the right. Founder edits and locks. The old Decision is archived.

---

## 10. COMMUNICATION FLOW ARCHITECTURE

*(Per P11, all internal communication is strictly Founder ↔ KRISHNA).*
- **Start**: `CMD+Space`. 
- **Action**: A conversation with KRISHNA never ends in a void. It must result in a **State Change**. If the Founder debates strategy with KRISHNA for 20 minutes, KRISHNA ends the flow by presenting a button: `[Save Context to Knowledge Vault]` or `[Generate Mission from Conversation]`.

---

## 11. KRISHNA FLOW ARCHITECTURE

**The Generative Journey**:
1. **Query**: *"Why are sales down in Region 4?"*
2. **Synthesis**: KRISHNA pulls from Telemetry, parses recent Decisions, and returns a 2-paragraph synthesis.
3. **Recommendation**: KRISHNA appends an actionable button: `[Spawn Logistics Audit Task]`.
4. **Execution**: The Founder clicks the button. KRISHNA executes silently in the background.

---

## 12. SEARCH FLOW ARCHITECTURE

- **Command Palette (`CMD+K`)**: 
  - **Type an ID** (e.g., `M-104`): Instantly opens Mission 104.
  - **Type a slash command** (e.g., `/vault`): Instantly opens the Knowledge Vault application.
  - **Type a concept** (e.g., `brand voice`): Performs a semantic vector search and returns the top 3 Knowledge Nodes.

---

## 13. SHORTCUT ARCHITECTURE

Power-user velocity is paramount.
- `CMD + K`: Global Command Palette.
- `CMD + Space`: KRISHNA Conversation Modal.
- `ESC`: Universally closes the top-most Modal or Overlay, returning focus to the underlying Screen.
- `CMD + Enter`: Universally means "Approve," "Lock," or "Execute" on any active form or output.

---

## 14. COMPLETE NAVIGATION MAP

1. **Start** → `Desktop Void`
2. **Intent** → `CMD+Space` (KRISHNA) OR `CMD+K` (Search)
3. **Execution Routing** → `Mission Control`
   - View DAG → Click Task → `Task Modal` → View Agent Output → `[Approve/Reject]`
4. **Knowledge Routing** → `Knowledge Vault`
   - View Registry → Click Decision → `Decision Modal` → Click `[Supersede]` → `Editor View`
5. **Analysis Routing** → `Telemetry`
   - View Chart → Click Anomaly → Triggers KRISHNA Overlay with context.

---

## 15. V1 NAVIGATION BLUEPRINT

To guarantee the OS is usable on Day 1 without infinite UI loop bugs, V1 will enforce the simplest possible paths:

- **No Drag-and-Drop**: V1 navigation relies entirely on Clicks and Keystrokes. You cannot drag a Task from one Agent to another.
- **The Esc-Key Rule**: The `ESC` key is a hard-coded safety mechanism. No matter how deep into an overlay or application the Founder navigates, pressing `ESC` repeatedly will predictably close modals and return the OS to the pure Desktop Void.
- **Dual Invocation**: The OS is navigable entirely through the mouse (via the Auto-Hidden Dock and clickable lists) OR entirely through the keyboard (`CMD+K`). Both paths must be built simultaneously in V1.
