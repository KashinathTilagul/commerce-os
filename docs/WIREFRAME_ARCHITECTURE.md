# EKVAAR OS — D4 WIREFRAME & INTERFACE ARCHITECTURE

*(Note: This specification maps the structural layout of the OS, strictly avoiding visual aesthetics, colors, or typography per Constitutional constraints).*

## 1. INTERFACE PHILOSOPHY

- **The Philosophy**: EKVAAR OS feels like a **Command Center**.
- **The Paradigm**: It is not a consumer operating system designed for browsing or entertainment. It is a high-density, utilitarian surface designed for maximum throughput. It relies on stark contrast, extreme negative space, and rigid wireframe grids.

---

## 2. DESKTOP STRUCTURE

The base layer of the OS is structurally austere.
- **Top Zone**: A minimalist, low-profile Menu Bar.
- **Center Zone**: The Desktop Void (purely empty, reserved for the KRISHNA Quick Command overlay).
- **Bottom Zone**: The Auto-hidden Dock.
- **Notification Zone**: Top-right for standard; Dead-center for Critical.

---

## 3. MENU BAR ARCHITECTURE

The Menu Bar exists only for hardware state and global context.
- **Left**: OS Core Indicator (System Health).
- **Center**: Active Workspace Indicator (e.g., `[WORKSPACE: FOUNDER]`).
- **Right**: KRISHNA State Indicator (Listening / Processing / Idle), Audio Control, and the Clock.
- **Excluded**: File menus (File, Edit, View) do not exist. App controls exist inside the applications, not the global Menu Bar.

---

## 4. DOCK ARCHITECTURE

The absolute minimum physical failsafe.
- **Placement**: Bottom Center, Auto-hidden.
- **Capacity**: Maximum of 3 applications.
- **Pinned Applications**: Mission Control, Knowledge Vault, Telemetry.
- **Behavior**: Hover to reveal. Click to launch full-screen. No indicators for "running" apps, because core apps are always active in memory.

---

## 5. LAUNCHPAD ARCHITECTURE

*(Per P17 Desktop UX Constraints)*: **ABOLISHED.**
- There is no "Launchpad" or grid of application icons.
- **Discovery Model**: Because there are no third-party applications, the Founder does not need to discover or browse apps. If they need something outside the 3 core apps, they type it into the global Search (`CMD+K`).

---

## 6. MISSION CONTROL LAYOUT

The Executive Surface is structured for immediate action.
- **Top Zone**: Critical Risks and System-level Blockages (Alerts).
- **Left Column (25%)**: The Approval Queue (List of Draft Outputs awaiting Founder signature).
- **Main Area (75%)**: The DAG Execution View (Hierarchical, indented list of active Missions and Tasks).
- **Behavior**: Clicking an item in the Left Column opens the Task Output in the Main Area.

---

## 7. VIRTUAL HQ LAYOUT

Virtual HQ is structurally a lens applied to Mission Control.
- **Top Zone**: Global Organizational Health stats (Total Velocity).
- **Main Area**: A rigid, multi-column list representing Domains (e.g., Column 1: Brand, Column 2: Finance).
- **Content**: Inside each Domain column is a list of active Agents and the specific Mission they are currently attached to.

---

## 8. KRISHNA SURFACES

KRISHNA dynamically shifts its structural footprint based on intent.
- **Quick Command (`CMD+Space`)**: A horizontal text-input bar floating dead center.
- **Conversation Modal**: A centered vertical window (50% screen width) containing the conversational dialogue and synthesized data.
- **Presence Mode**: 100% full-screen blackout. A single pulsing waveform or minimal text anchor in the absolute center.

---

## 9. WORKSPACE LAYOUTS

Workspaces do not alter the physical wireframe layout; they alter the data within it.
- **Structure**: The physical layout of Mission Control remains identical whether in the "Founder" or "Brand" Workspace.
- **Difference**: The Left Column (Approval Queue) and Main Area (DAG) dynamically filter out irrelevant data when a specific Domain Workspace is engaged.

---

## 10. APPLICATION LAYOUT STANDARDS

Every Core Application adheres to a strict 3-Column standard to minimize cognitive switching costs:
1. **Left (Context/Nav Zone - 20%)**: Lists, filters, and queues (e.g., The Decision Registry List).
2. **Center (Primary Zone - 55%)**: The main data view (e.g., The Document Editor or DAG graph).
3. **Right (Metadata/Action Zone - 25%)**: Node details, audit history, and execution actions (e.g., "Approve", "Supersede"). Only visible when a Node is actively selected.

---

## 11. WINDOW STANDARDS

- **Window Types**: V1 explicitly forbids draggable, resizable, floating, or stackable windows.
- **Window States**: Applications open 100% Full-Screen.
- **Modal Views**: Overlays are strictly center-aligned. They dim the underlying Full-Screen application. Modals cannot stack deeper than 1.

---

## 12. SEARCH SURFACE LAYOUT (`CMD+K`)

- **Structure**: A large, center-aligned modal.
- **Top**: Omnibox text input.
- **Body**: A real-time, categorized results list (Category 1: Missions, Category 2: Decisions, Category 3: KRISHNA Generative Actions).
- **Search-to-Action**: Selecting a result instantly routes the UI to the correct Application and opens the Right-Column Metadata Zone for that object.

---

## 13. NOTIFICATION SURFACE LAYOUT

- **Informational**: A small, transient toast notification in the Top-Right corner. Non-interactive. Fades after 3 seconds.
- **Critical**: A Dead-Center Modal. Dims the entire screen. Pauses all OS interaction. Requires an explicit button click (`[Acknowledge]` or `[Resolve]`) to dismiss.

---

## 14. COMPLETE WIREFRAME MAP

```text
[ SCREEN EDGE ]
---------------------------------------------------------
| [OS Health]   [Workspace]           [KRISHNA] [Time]  | <- MENU BAR
---------------------------------------------------------
|                                                       |
|                                                       |
|             -----------------------------             |
|             | > KRISHNA Command Input   |             | <- CMD+SPACE OVERLAY
|             -----------------------------             |
|                                                       |
|                                                       |
|                                                       |
---------------------------------------------------------
|              [Telemetry] [Vault] [Mission]            | <- AUTO-HIDDEN DOCK
---------------------------------------------------------
```
*Standard Application Layout (Full Screen):*
```text
[ Left: Queue/List 20% ] | [ Center: Main Data 55% ] | [ Right: Meta/Actions 25% ]
```

---

## 15. V1 INTERFACE BLUEPRINT

To ensure rapid, bug-free front-end development, V1 wireframes rely on extreme structural rigidity:

- **No Split-View Windowing**: While future specs mention 50/50 split views, V1 relies entirely on the **3-Column Layout** spanning 100% of the screen.
- **Centered Modals**: All transient interactions (Search, KRISHNA, Task Details) happen in dead-center overlays.
- **No Draggable Elements**: The Founder cannot drag a column to resize it. Layouts are mathematically fixed.
- **The Void**: If no app is open, and no modal is active, the screen is structurally empty except for the Menu Bar.
