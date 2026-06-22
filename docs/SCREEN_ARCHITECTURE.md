# EKVAAR OS — D2 SCREEN & WINDOW ARCHITECTURE

*(Note: This specification builds upon P17 Desktop UX and D1 Information Architecture to define the physical routing of UI containers).*

## 1. SCREEN PHILOSOPHY

To eliminate cognitive overload, visual containers are strictly defined:
- **Screen**: A full-canvas, immersive environment that commands 100% of the display.
- **Window**: A bounded container (strictly restricted to 50/50 split-view mode in future versions).
- **Overlay (Modal)**: A transient, center-aligned box that interrupts execution for a specific action (e.g., Approval) and vanishes upon completion.
- **Workspace**: A global filter state applied invisibly to whatever Screen is currently active.

---

## 2. ROOT SCREEN ARCHITECTURE

There are exactly four Root Screens in EKVAAR OS.
1. **The Desktop Void**: The default base layer. Pure black/blank canvas.
2. **Mission Control**: The Executive Surface.
3. **Knowledge Vault**: The Memory Surface.
4. **Telemetry**: The Analytics Surface.
*(Note: As defined in P17, Launchpads and App Grids are abolished. Virtual HQ is a lens/filter applied to Mission Control, not a separate root screen).*

---

## 3. APPLICATION WINDOW ARCHITECTURE

The 3 Core Applications do not have complex window management.
- **Primary View**: The default full-screen list/graph state.
- **Secondary View (Detail)**: Replaces the Primary View completely (no pop-outs).
- **Modal Views**: Used strictly for binary actions (e.g., the `[Approve / Reject]` Draft modal in Mission Control).

---

## 4. WORKSPACE ARCHITECTURE

Workspaces are not screens. They are invisible global variables.
- **Founder Workspace**: `Filter = NULL`. Shows all data.
- **Domain Workspace (e.g., Brand)**: `Filter = Domain:Brand`. When active, Mission Control hides Operations Tasks. Telemetry hides Financial Metrics.
- **Behavior**: Switching Workspaces does not change the active Screen; it instantly re-renders the data inside it.

---

## 5. MISSION ARCHITECTURE (SCREENS)

Mission data is strictly constrained to the **Mission Control Root Screen**.
- **The Queue View**: A hierarchical text list of blocked DAGs and pending approvals.
- **The Mission Detail View**: Replaces the Queue View. Displays the deep topological execution graph of a single Mission.
- **The Task Modal**: Clicking a specific Task opens an overlay showing the exact Context Envelope, the Agent assigned, and the Draft Output JSON.

---

## 6. KNOWLEDGE ARCHITECTURE (SCREENS)

Knowledge data is constrained to the **Knowledge Vault Root Screen**.
- **The Registry View**: The chronological list of locked Decisions and Facts.
- **The Document Editor**: A dedicated, full-screen, markdown-native writing environment where the Founder explicitly codifies a new Constitutional rule.
- **The Diff Modal**: Before a Decision is superseded, a modal shows a red/green diff of the changes for final Founder signature.

---

## 7. AGENT ARCHITECTURE (SCREENS)

Agents do not have dedicated "Profile Screens" to prevent anthropomorphism.
- **Agent Status View**: A simple table residing within Mission Control (or the Virtual HQ lens).
- **Agent Execution Modal**: Clicking an Agent shows a live-streaming terminal output of its current LLM inference and token burn rate.

---

## 8. ORGANIZATION ARCHITECTURE (SCREENS)

The organization (Departments, Teams) is visualized via the **Virtual HQ Lens** applied to Mission Control.
- There are no "HR" screens or "Employee Profiles" in V1.
- You do not click a Department to open a new window; clicking a Department simply filters the Mission Control DAG.

---

## 9. COMMUNICATION ARCHITECTURE (SCREENS)

*(Per P11: Communication as an Application is abolished).*
- **Conversation Modal**: A transient center-screen overlay where the Founder types/speaks to KRISHNA.
- **Notification Modal**: A brief toast/overlay that interrupts the active Screen.
- There is no "Inbox Screen".

---

## 10. EXECUTIVE ARCHITECTURE (SCREENS)

The Executive Suite is entirely housed within **Mission Control**.
- **The Approval Queue**: The default landing state of Mission Control.
- **The Risk Overlay**: When KRISHNA detects a critical anomaly, it renders an un-dismissible red overlay demanding a Founder Decision before execution can resume.

---

## 11. SEARCH ARCHITECTURE

- **Global Search (`CMD+K`)**: The Command Palette. It is a transient overlay that can be summoned instantly over any Root Screen, Window, or Modal.
- **Search Results**: Clicking a search result instantly routes the OS to the correct Root Screen and opens the target Node Detail View.

---

## 12. KRISHNA ARCHITECTURE (SURFACES)

KRISHNA exists above the screen hierarchy.
- **Quick Mode**: The `CMD+Space` floating input bar.
- **Conversation Mode**: A translucent overlay that dims the active Root Screen.
- **Presence Mode**: A total blackout of the Root Screen, leaving only a minimalist voice waveform or text prompt for zero-distraction deep work.

---

## 13. WINDOW RELATIONSHIP MODEL

**Contextual Overlays vs Routing:**
- If you are in Mission Control examining a blocked Task, and you click the cited Decision ID causing the block, the OS does *not* route you to the Knowledge Vault Root Screen.
- Instead, it opens a **Read-Only Context Modal** over Mission Control. You read the Decision, close the Modal, and immediately resolve the Task. You never lose geographic context.

---

## 14. COMPLETE SCREEN MAP

1. `Desktop Void`
   └── `KRISHNA Modal` (CMD+Space)
   └── `Command Palette Modal` (CMD+K)
2. `Mission Control` (Root)
   ├── `Mission Detail View`
   │    └── `Task Execution Modal`
   ├── `Approval Queue View`
   │    └── `Draft Diff Modal`
   └── `Agent Status View`
3. `Knowledge Vault` (Root)
   ├── `Decision Registry View`
   └── `Document Editor View`
4. `Telemetry` (Root)

---

## 15. V1 SCREEN BLUEPRINT

To ensure rapid frontend development and flawless stability, V1 imposes absolute constraints on window rendering:

- **Zero Window Management**: V1 will completely bypass draggable, resizable, or stackable windows.
- **Full Screen Only**: The 3 Core Apps (Mission Control, Vault, Telemetry) open strictly 100% full-screen.
- **Single Modal Depth**: Modals cannot open modals. V1 restricts overlay depth to 1. If you are in a Modal, you must close it to take a new action.
- **Summary**: The V1 Screen Architecture is a flat state machine. You are either in the Desktop Void, in a Full-Screen App, or looking at the Global CMD+K Overlay.
