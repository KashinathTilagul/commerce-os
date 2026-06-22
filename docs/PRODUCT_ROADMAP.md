# EKVAAR OS — D7 PRODUCT ROADMAP & BUILD SEQUENCING

*(Note: This document defines the exact execution sequence required to construct EKVAAR OS. It is a strict build order prioritizing critical dependencies over UI polish).*

## 1. LAUNCH PHILOSOPHY

- **The Philosophy**: Build from the center out. Data → Logic → Interface → Agents → Intelligence → Automation.
- **Definitions**:
  - **Phase 0 (The Skeleton)**: Usable but bare. Proves the data architecture.
  - **V1 (Phase 1 & 2)**: The Minimum Viable Operating System. The Founder can manually manage Tasks, and single Agents can execute them.
  - **V2 (Phase 3 & 4)**: The Intelligence System. The OS starts thinking proactively (Risks/Signals).
  - **V3 (Phase 5 & 6)**: The Autonomous Organization. Multi-agent orchestration and spatial (Virtual HQ) navigation.

---

## 2. CRITICAL PATH SYSTEMS

Certain systems must exist before others can function:
1. **The Relational Database** (Mandatory baseline for all state).
2. **The Knowledge Vault** (Missions cannot exist safely without Decisions to constrain them).
3. **Mission Control DAGs** (Agents cannot execute without a Task to attach to).
4. **The Agent Runtime** (The workforce).
5. **KRISHNA Kernel** (The semantic bridge uniting them).

---

## 3. PHASE 0: THE SYSTEM SHELL

**Goal**: Create a usable operating system skeleton.
- **Systems**: The Relational Database, The Desktop Void, The Global Search (`CMD+K`), Basic User Auth.
- **What is missing**: No AI. No LLMs. No Agents.
- **Launch Criteria**: The Founder can hit `CMD+K`, type a Task, and it saves to the PostgreSQL database. The 3-Column UI layout is established.

---

## 4. PHASE 1: THE FOUNDER OS

**Goal**: The Founder can manage strategy and execution manually.
- **Systems**: Knowledge Vault (Decision Registry), Mission Control (Task DAGs), Basic Event Bus.
- **What is missing**: Agents. Telemetry.
- **Launch Criteria**: The Founder can write a Decision in the Vault. The Founder can create a Mission with 3 Tasks. The Tasks successfully reference the Decision.

---

## 5. PHASE 2: THE WORKFORCE OS (V1 LAUNCH)

**Goal**: Introduce AI execution.
- **Systems**: The Agent Runtime, Context Envelope Generator, Mission Control Approval Queue.
- **Dependencies**: Phase 1 DAGs must be flawless.
- **Launch Criteria**: The OS wraps a Task into a Context Envelope, sends it to an Agent, the Agent returns JSON, and it appears in the Founder's Approval Queue. 

---

## 6. PHASE 3: EXECUTIVE INTELLIGENCE

**Goal**: The OS becomes proactive.
- **Systems**: Telemetry Ingestion, Signal Detection, Risk Engine.
- **Dependencies**: The database must be populated with historical data to generate baselines.
- **Launch Criteria**: The OS detects a drop in revenue, generates a "Risk", and surfaces a red alert in Mission Control.

---

## 7. PHASE 4: AUTOMATION LAYER

**Goal**: Eliminate manual state transitions.
- **Systems**: Workflow Engine, Escalation Engine.
- **Limitations**: Hardcoded mechanical loops only (No autonomous LLM-driven state mutations without Founder approval).
- **Launch Criteria**: When the Founder clicks `[Approve]` on Task A, the system automatically transitions Task B to `Executing` and dispatches it to an Agent.

---

## 8. PHASE 5: VIRTUAL HQ

**Goal**: Spatial organization of the company.
- **Systems**: Departmental Domains, Workspace Filters.
- **Dependencies**: Requires massive task volume to necessitate filtering.
- **Launch Criteria**: Clicking the "Brand Wing" successfully filters Mission Control, Telemetry, and the Vault to only show Brand-tagged nodes.

---

## 9. PHASE 6: AUTONOMOUS OPERATIONS

**Goal**: Multi-agent coordination and strategic planning.
- **Systems**: KRISHNA Planning Runtime, Agent Negotiation Protocol.
- **Guardrails**: Level 1 and 2 Constitutional Decisions remain strictly locked behind human biometric/cryptographic approval.
- **Launch Criteria**: The Founder types a 1-sentence goal. KRISHNA autonomously generates a 50-node DAG, assigns 10 Agents, and executes the Level 3 tasks without human intervention, stopping only for final Output Approval.

---

## 10. BUILD ORDER

**Priority Sequence:**
1. DB & Core Models (High Value, Low Risk)
2. Desktop UX & Navigation (Med Value, Low Risk)
3. Knowledge Vault (High Value, Med Risk)
4. Mission Control State Machine (High Value, High Risk)
5. Agent Runtime & Sandboxing (High Value, Extreme Risk)
6. Telemetry & Intelligence (Med Value, Med Risk)
7. Virtual HQ (Low Value, Low Risk)

---

## 11. TEAM REQUIREMENTS

- **Phase 0-2 (V1)**: 1x Lead Backend/Systems Architect, 1x Lead Frontend Engineer (React/TypeScript). *Lean, elite team to prevent architectural drift.*
- **Phase 3-4 (V2)**: Add 1x AI/Data Engineer (Telemetry/Vector DB tuning).
- **Phase 5-6 (V3)**: Add 1x UI/UX Engineer, 1x DevOps Engineer (Agent scaling).

---

## 12. RISK MAP

- **Technical Risk**: Agent hallucination breaking the DAG JSON schema (Phase 2).
- **Product Risk**: The Founder finds the Command-First navigation too steep a learning curve (Phase 0).
- **Architecture Risk**: The Event Bus becomes bloated or desynchronized, corrupting execution state (Phase 4).
- **Execution Risk**: Getting bogged down in UI polish instead of database integrity.

---

## 13. THE KILL LIST

To ensure launch, the following features are **explicitly banned** from the build process:
- ❌ **3D Environments / Avatars**: No visual representations of the Virtual HQ.
- ❌ **SaaS Multi-Tenancy**: This is a single-organization OS. Do not build account switching, subscription billing, or org-management.
- ❌ **Third-Party App Store**: Do not build OAuth or external integration APIs yet.
- ❌ **Native Desktop App (Electron)**: V1 is a web-app accessed via the browser. Avoid native OS integration complexity.
- ❌ **Animated Transitions**: Zero CSS animations. Hard cuts only.

---

## 14. LAUNCH CRITERIA (V1)

**What constitutes a successful V1 (Phases 0-2) deployment?**
- **Must Work**: A Founder can log in, create a Constitutional Decision, define a Mission, dispatch it to an LLM Agent, and explicitly approve the JSON output. The UI must render instantly.
- **May Be Missing**: Telemetry charts, Virtual HQ filters, automated DAG progression, voice interaction.

---

## 15. FINAL ROADMAP

### PHASE 0: The Skeleton (Weeks 1-2)
- **Objectives**: Stand up the Modular Monolith, Database, and basic UI.
- **Systems**: Postgres DB, Express Backend, React Frontend, `CMD+K`.
- **Success**: A fully functional, but empty, 3-column UI.

### PHASE 1: Founder OS (Weeks 3-4)
- **Objectives**: Enable manual strategy execution.
- **Systems**: Knowledge Vault (CRUD), Mission Control (Manual DAG creation).
- **Success**: Founder can map out a project and link it to a Decision.

### PHASE 2: Workforce OS [V1 LAUNCH] (Weeks 5-7)
- **Objectives**: Connect AI to the execution graph.
- **Systems**: Agent Runtime, Context Envelopes, Approval Queue.
- **Success**: An Agent successfully completes a Task.

### PHASE 3: Executive Intelligence (Weeks 8-10)
- **Objectives**: Proactive system monitoring.
- **Systems**: Telemetry Ingestion, Risk Engine.
- **Success**: System correctly flags a metric anomaly based on a Decision constraint.

### PHASE 4: Automation Layer (Weeks 11-12)
- **Objectives**: Reduce Founder operational load.
- **Systems**: Event Bus, Trigger Engine.
- **Success**: Approved outputs automatically dispatch the next task in the DAG.

### PHASE 5: Virtual HQ (Weeks 13-14)
- **Objectives**: Contextual navigation.
- **Systems**: Workspace filtering logic.
- **Success**: Founder can filter the entire OS state by "Department".

### PHASE 6: Autonomous Operations (Weeks 15+)
- **Objectives**: Self-driving company execution.
- **Systems**: KRISHNA Planning Runtime.
- **Success**: KRISHNA converts natural language into a fully populated, multi-agent Mission DAG.
