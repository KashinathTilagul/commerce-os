# EKVAAR OS — P17 DESKTOP UX ARCHITECTURE

*(Note: This document builds upon the P2 Interaction Model and P4 Desktop Architecture, focusing strictly on the experiential flow of the OS).*

## 1. DESKTOP PHILOSOPHY

**What is the desktop?** A zero-distraction cognitive void. It is a stage for focus, not a storage shelf.
**What purpose does it serve?** To force the Founder's attention toward Intent (KRISHNA) rather than clutter.
**What should users see?** The absolute minimum. A blank expanse anchored solely by the KRISHNA Kernel visual interface.
**What should users never see?** Files, folders, grids of application icons, persistent widgets, or scattered windows.

---

## 2. STARTUP EXPERIENCE

**The First 30 Seconds:**
1. **Boot**: The screen illuminates into the pure Desktop void. No loading bars for individual apps.
2. **Presence**: The KRISHNA interface activates immediately upon biometrics/login.
3. **The Briefing**: KRISHNA does not wait to be queried. It proactively delivers the Morning Briefing (Voice/Text), surfacing the overnight Execution DAG delta ("3 Missions advanced, 2 Outputs require approval").
4. **Attention**: The Founder's first action is always alignment, not searching for an app to open.

---

## 3. DAILY OPERATING EXPERIENCE

The OS UX adapts to the natural rhythm of the Founder:
- **Morning (Alignment)**: High interaction with KRISHNA. Founder reviews Draft Outputs from overnight Agent runs, approves/rejects them, and clears Critical Notifications.
- **Midday (Execution)**: Command-driven deep work. The Founder shifts into specific Workspaces (e.g., Brand) and spends hours in the Knowledge Vault editing, or in Telemetry analyzing.
- **Evening (Brain Dump)**: The Founder closes all apps. Speaks a stream-of-consciousness dump of the day's events to KRISHNA, which KRISHNA converts into overnight Agent Tasks.

---

## 4. DESKTOP OBJECTS

Traditional files (`.docx`, `.pdf`) do not exist on the desktop.
- **What exists**: Only **Transient Output Widgets**.
- **Behavior**: When the Founder asks to see an Output or a Metric, it renders as an ephemeral window in the center of the screen. When dismissed, it vanishes back into the Knowledge Vault. It cannot be dragged to the corner and "saved" on the desktop.

---

## 5. WINDOW ARCHITECTURE

The UX enforces deep work through ruthless window constraints:
- **Operating Model**: Single Window or strict **50/50 Split View** only.
- **Behavior**: Free-floating, overlapping, stackable windows are banned at the OS level. They create cognitive noise. 
- **Workspace Assignment**: Windows are strictly bound to the active Workspace context.

---

## 6. DOCK EXPERIENCE

- **Purpose**: A physical failsafe when Voice/Text commands are too slow.
- **Pinned Apps**: Strictly limited to the 3 Core V1 Applications (Telemetry, Knowledge Vault, Mission Control).
- **Behavior**: Auto-hidden by default. Requires intentional edge-hover to summon.
- **Running Apps**: There is no concept of "quitting" an app. They are either visible or hidden.

---

## 7. LAUNCHPAD EXPERIENCE

- **Purpose**: Abolished.
- **Experience**: The concept of a Launchpad (a grid of dozens of apps) is entirely eradicated in EKVAAR OS. Because there are no third-party apps, there is nothing to launch via a grid. All interaction is routed through KRISHNA or the Dock.

---

## 8. MISSION CONTROL EXPERIENCE

*(Note: Defined in P3 as the DAG Diagnostic App).*
- **Purpose**: The Founder's high-altitude tactical map.
- **Visibility**: Opens Full Screen only. It is an immersive diagnostic environment.
- **Relationship**: It visually maps the exact bottleneck in the Execution pipeline, allowing the Founder to point and click to unblock a stalled Mission.

---

## 9. NOTIFICATION EXPERIENCE

Interruptions are an attack on the Founder's flow state.
- **Urgent (Critical)**: Bypasses Focus Mode. Pauses KRISHNA. Examples: Level 1 Decision Conflict, blocked Mission, severe Metric drop.
- **Informational (Standard)**: Rendered as silent, unobtrusive badges. Processed asynchronously during the Morning/Evening reviews. Examples: Agent finishes a minor Task.
- **Background**: Zero UX presence. Handled silently.

---

## 10. CONTROL CENTER EXPERIENCE

- **What belongs there**: Absolute hardware minimums (Audio, Microphone for Voice UX), plus OS Context controls (Workspace Switching, Focus Mode toggle).
- **What does NOT**: App-specific settings. The Control Center is for global OS state only.

---

## 11. SEARCH EXPERIENCE

- **How it behaves**: Invoked via global hotkey (`CMD+K`). It is a lightning-fast, overlay modal.
- **Differs from KRISHNA**: KRISHNA is *generative* (slower, synthesizes answers). Search is *deterministic* (instant retrieval of an exact Knowledge node or Metric).
- **UX Flow**: If the Founder knows exactly what they want, they `CMD+K`. If they want to reason about it, they speak to KRISHNA.

---

## 12. WORKSPACE EXPERIENCE

Workspaces are cognitive filters, not virtual desktops.
- **Experience**: Switching from the "Finance" workspace to the "Brand" workspace does not just change the wallpaper; it globally alters KRISHNA's context. 
- **Navigation**: Switched via the Control Center or a direct command ("KRISHNA, shift to Brand mode").

---

## 13. CONTEXT PRESERVATION

The OS must never lose the Founder's train of thought.
- **Restoration**: If the Founder closes the Knowledge Vault mid-edit to check a Critical Notification, reopening the Vault restores the exact cursor position, unsaved draft state, and scroll depth.
- **Conversations**: KRISHNA remembers the exact thread of a complex reasoning task even if the UI is dismissed.

---

## 14. POWER USER EXPERIENCE

EKVAAR OS is built for velocity.
- **Keyboard-First**: Every primary OS action can be executed without a mouse.
- **Command Palette (`CMD+K`)**: Doubles as the Search input and a mechanical quick-action router (e.g., typing `/new-mission`).
- **Expert Workflows**: Bypassing KRISHNA's voice synthesis entirely in favor of rapid keystroke commands for maximum throughput.

---

## 15. V1 DESKTOP UX BLUEPRINT

To ensure V1 launches effectively without bogging down in complex window management rendering:

- **Full Screen Only**: Split-view windowing is deferred. V1 apps and widgets will open purely Full Screen over the Desktop void.
- **No Workspaces**: Context filtering is deferred. V1 operates in a single, unified "Founder Workspace."
- **Keyboard Navigation**: V1 will prioritize the `CMD+K` command palette over complex voice-UI visualization to ensure the interaction loop is stable and fast.
- **Summary**: The V1 UX is brutally utilitarian. It is a text/voice terminal (KRISHNA) sitting in front of 3 full-screen monolithic applications.
