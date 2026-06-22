# EKVAAR OS — E1 REPOSITORY & CODEBASE ARCHITECTURE

*(Note: This document defines the structural organization of the EKVAAR OS codebase. It is the bridge between the Constitutional/Design phases and the Engineering Execution phase).*

## 1. REPOSITORY PHILOSOPHY

**The Model: Strict Monorepo**
- **Why**: A Modular Monolith (as defined in D6) requires atomic deployments and perfectly synchronized types between the frontend, backend, and agent runtimes. A Monorepo ensures that if an Event Schema changes in the backend, the frontend build fails immediately if it is not updated.
- **Rule**: Splitting EKVAAR OS into multiple repositories is explicitly banned.

---

## 2. ROOT STRUCTURE

The top-level structure strictly separates runnable applications from business logic and shared utilities.

```text
ekvaar-os/
├── apps/           # Runnable execution environments (Frontend, Backend Server)
├── core/           # The Modular Monolith (Domain logic)
├── packages/       # Shared libraries, UI components, and TypeScript definitions
├── infrastructure/ # Deployment, Docker, and CI/CD configs
└── docs/           # The Constitutional Blueprints (P0-P20, D1-D5, E1)
```

---

## 3. APPLICATION LAYER (`apps/`)

These are the entry points. They contain zero business logic; they only wire up the `core/` modules and serve them.
- `apps/frontend/`: The React/Next.js shell containing the views for Mission Control, Knowledge Vault, Virtual HQ, and Telemetry.
- `apps/backend/`: The Express/Node.js server that boots the Event Bus, connects to PostgreSQL, and exposes the Interface API.

*(Note: Per the D7 Kill List, standalone apps for Communications, Calendar, and Files do not exist in V1).*

---

## 4. KRISHNA LAYER (`core/krishna/`)

The semantic router of the OS.
- `memory/`: Injects the Context Envelope.
- `reasoning/`: Evaluates intent against Constitutional constraints.
- `planning/`: Converts intent into a DAG (Directed Acyclic Graph).
- `execution/`: Translates the DAG into strict JSON payloads for the Mission Service.
- `coordinator/`: The sub-module that routes tasks to specific Agent classes.

---

## 5. AGENT LAYER (`core/agent/`)

The sandboxed workforce execution environment.
- `registry/`: The list of available Agent classes and their capabilities.
- `runtime/`: The stateless execution loop (Fetch Task → Prompt LLM → Validate JSON → Return Output).
- `memory/`: Ephemeral scratchpad storage (wiped after Task completion).
- `evaluation/`: The Zod schema validator that strictly enforces LLM output formats.

---

## 6. KNOWLEDGE LAYER (`core/knowledge/`)

The single source of truth for the company.
- `registry/`: The CRUD logic for the Relational Decision Database.
- `graph/`: The relationship engine mapping Decisions to Missions.
- `retrieval/`: The Hybrid Search engine (SQL exact match + Vector semantic match).
- `documents/`: The assimilation engine for chunking and embedding approved outputs.

---

## 7. SHARED PACKAGES (`packages/`)

Packages are strictly versioned, dependency-free internal libraries.
- `packages/types`: The absolute source of truth. Every JSON schema, Task interface, and Database model is defined here.
- `packages/events`: The Zod schemas defining the shape of every system event (e.g., `MissionCreatedEvent`).
- `packages/ui-kit`: The dumb, stateless React components (Buttons, Inputs, 3-Column Layouts) built precisely to D5 Design System specs.
- `packages/utils`: Pure mathematical or string manipulation functions.

---

## 8. API BOUNDARIES

- **Internal APIs**: The `apps/backend` communicates with the frontend via tRPC or standard REST, sharing types directly from `packages/types` to ensure end-to-end type safety.
- **Agent APIs**: The boundary between the OS and the LLM. It is defined strictly by the `Context Envelope` schema.
- **External APIs**: Banned in V1. The OS is air-gapped from external SaaS platforms.

---

## 9. EVENT BOUNDARIES

- **Publishers**: Any `core/` domain can publish an event (e.g., `core/agent` publishes `OutputGenerated`).
- **Consumers**: Any `core/` domain can subscribe to an event (e.g., `core/automation` listens for `OutputGenerated`).
- **Event Contracts**: Defined strictly in `packages/events`. If a domain publishes a payload that fails the Zod schema validation, the system instantly throws a Fatal Error to prevent data corruption.
- **Event Ownership**: The `core/automation` module owns the central Event Bus implementation.

---

## 10. STATE BOUNDARIES

- **Global OS State**: Lives exclusively in the PostgreSQL Database.
- **Workspace State**: Lives in the Frontend Global Store (React Context / Zustand). It acts merely as a visual filter applied to the Global OS State.
- **Session State**: Transient UI state (e.g., "Is the KRISHNA modal currently open?") lives locally in the DOM component.

---

## 11. OWNERSHIP MODEL

Enforced via a strict `CODEOWNERS` file.
- **The Founder**: Owns the `docs/` (Constitutions) and the `core/knowledge/` architecture.
- **System Agents (e.g., `ui_builder`)**: Own `packages/ui-kit/`. They can generate React components but cannot touch database schemas.
- **Core Engineering Agents**: Own `core/`. Modifying these paths requires explicit Founder approval (Level 1 PR Review).

---

## 12. TESTING ARCHITECTURE

- **Unit Testing**: Every pure function in `packages/utils` and `core/` must have 100% coverage.
- **Integration Testing**: Testing the flow from `core/krishna` → `core/execution` using a mocked, instant-response LLM.
- **Agent Testing (Prompt Eval)**: A dedicated test suite in `core/agent/evaluation` that runs the current Prompt against 100 historical Tasks to ensure the LLM JSON output schema does not break.

---

## 13. DOCUMENTATION ARCHITECTURE

- **Constitutional Blueprints**: Live in `docs/architecture/` (P0-P20, D1-D7, E1). They are immutable unless explicitly superseded.
- **Architecture Decision Records (ADRs)**: Live in `docs/adr/`. Used to document *why* a specific engineering decision was made (e.g., "Why we chose pgvector over Pinecone").
- **Code Comments**: Used strictly to explain *why* code exists, never *what* it does. The `packages/types` act as the self-documenting API contract.

---

## 14. REPOSITORY GOVERNANCE

- **Main Branch Protection**: The `main` branch is locked. Direct commits are mathematically impossible.
- **CI/CD Pipeline**: A PR cannot be merged unless Typecheck, Linting, Unit Tests, and Agent Prompt Evals pass with 100% success.
- **Release Strategy**: V1 uses continuous deployment for the Frontend and controlled, versioned rollouts for the Backend database migrations.

---

## 15. FINAL REPOSITORY BLUEPRINT

```text
ekvaar-os/
├── apps/
│   ├── frontend/           (Next.js / React)
│   └── backend/            (Express / Node.js)
├── core/
│   ├── krishna/            (Intent & Routing)
│   ├── execution/          (DAG State Machine)
│   ├── agent/              (LLM Sandboxing)
│   ├── knowledge/          (Decisions & Vector Search)
│   ├── automation/         (Event Bus & Triggers)
│   └── intelligence/       (Telemetry & Signals)
├── packages/
│   ├── types/              (TypeScript Interfaces)
│   ├── events/             (Zod Event Schemas)
│   └── ui-kit/             (Stateless Design System Components)
├── infrastructure/
│   ├── db/                 (Postgres init scripts & migrations)
│   └── docker/             (Container definitions)
└── docs/
    ├── architecture/       (P0-P20, D1-D7, E1)
    └── adr/                (Engineering Decisions)
```
