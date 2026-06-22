# EKVAAR OS — E3 API & CONTRACT ARCHITECTURE

*(Note: This document defines the exact boundaries, inputs, and outputs for how EKVAAR OS systems communicate with each other. It establishes the "Contract-First" rules for the entire codebase).*

## 1. API PHILOSOPHY

- **Contract-First Principles**: Code is never written until the input/output schemas (the Contracts) are finalized and mathematically verified. The Contract *is* the API.
- **Strong Typing**: There is no implicit data. Every request, response, and event must conform to a central, rigid schema (defined in `packages/types`).
- **Zero-Trust Boundaries**: Systems do not trust each other. When the Agent Service returns data to the Mission Service, the Mission Service strictly validates the payload against the Contract before accepting it.
- **Event-Driven Principles**: State mutations are broadcast as immutable events. Services listen to contracts, they do not constantly poll other services.

---

## 2. COMMUNICATION ARCHITECTURE

- **Synchronous Communication**: Used exclusively for UI operations (e.g., Founder fetching Mission Control data, submitting a Search Query). It guarantees instant UX feedback.
- **Asynchronous Communication**: Used for compute-heavy tasks (e.g., KRISHNA planning a DAG, an Agent generating an output). Prevents UI blocking.
- **Event Communication**: Used for system-to-system state transitions (e.g., `OutputApproved` triggers the Automation Service to mark a Task `Completed`).
- **Real-Time Communication**: Used unidirectionally from the Backend to the Frontend via WebSockets to instantly update the UI when an Event fires.

---

## 3. SERVICE CONTRACT ARCHITECTURE

Every domain in the Modular Monolith communicates strictly through its Service Contract interface.
- **KRISHNA Service**: Translates human intent into system commands.
- **Mission Service**: Accepts DAG mutations. Exposes Task states.
- **Knowledge Service**: Accepts facts. Exposes immutable constraints.
- **Agent Service**: Accepts Context Envelopes. Returns validated JSON.
- **Intelligence Service**: Accepts raw metrics. Broadcasts Signals.
- **Automation Service**: Accepts System Events. Outputs State Mutations.

---

## 4. KRISHNA CONTRACT ARCHITECTURE

KRISHNA acts as the semantic layer between the Founder and the OS.
- **Intent Contract**: 
  - *Input*: `RawText` (from UI).
  - *Output*: `ParsedIntent` (Intent Type, Extracted Entities).
- **Context Generation Contract**:
  - *Input*: `ParsedIntent`.
  - *Output*: `ContextEnvelope` (Merged Decisions, Vector matches, recent OS state).
- **Execution Contract**:
  - *Input*: `ContextEnvelope`.
  - *Output*: `CommandPayload` (A strictly formatted system action, e.g., `CreateMission`, `CreateDecision`, or `DirectResponse`).

---

## 5. AGENT CONTRACT ARCHITECTURE

The boundary between deterministic code and stochastic LLM execution.
- **Execution Contract**:
  - *Input*: `TaskParameters` + `ContextEnvelope`.
  - *Output*: `AgentResponsePayload` (Strictly validated JSON matching the requested output schema).
- **Evaluation Contract**:
  - *Input*: `AgentResponsePayload`.
  - *Output*: `ValidationResult` (Success, or Failure + Error Context). If Failure, it triggers a retry loop.
- **Escalation Contract**:
  - *Input*: 3 consecutive `ValidationResult` failures.
  - *Output*: `EscalationEvent` sent to the Mission Service to flag the Task for Founder review.

---

## 6. KNOWLEDGE CONTRACT ARCHITECTURE

- **Decision Retrieval Contract**:
  - *Input*: `ContextTags` (e.g., "Marketing", "Budget").
  - *Output*: Array of `ActiveDecisions`.
- **Knowledge Assimilation Contract**:
  - *Input*: `ApprovedOutputPayload`.
  - *Output*: `KnowledgeNodeID`. (The payload is chunked, embedded, and stored).
- **Validation Contract**:
  - *Input*: `ProposedAction` + `ActiveDecisions`.
  - *Output*: `Boolean` (Does the action violate active constitutional constraints?).

---

## 7. MISSION CONTRACT ARCHITECTURE

- **Mission Creation Contract**:
  - *Input*: `MissionTitle`, `MissionIntent`, `Array<TaskDefinition>`.
  - *Output*: `MissionDAG` with generated IDs.
- **Task Mutation Contract**:
  - *Input*: `TaskID`, `NewState` (e.g., Executing, Blocked).
  - *Output*: `TaskUpdatedEvent`.
- **Output Submission Contract**:
  - *Input*: `TaskID`, `GeneratedOutput`.
  - *Output*: Transitions Task to `Awaiting_Approval`.

---

## 8. COMMUNICATION CONTRACT ARCHITECTURE

- **Message Submission Contract**:
  - *Input*: `ThreadID`, `SenderID`, `ContentPayload`.
  - *Output*: `MessageRecordedEvent`.
- **Meeting Synthesis Contract**:
  - *Input*: `MeetingTranscript`.
  - *Output*: Array of `ExtractedTasks` and `ExtractedDecisions`.

---

## 9. EVENT CONTRACT ARCHITECTURE

All events follow a universal base wrapper:
- **Base Structure**: `TraceID`, `Timestamp`, `ActorID`, `Topic`, `Payload`.

**Core Event Contracts**:
- `MissionCreated`: Payload contains the full DAG blueprint.
- `TaskAssigned`: Payload contains `TaskID` and `AgentID`.
- `OutputSubmitted`: Payload contains `TaskID` and the `DraftOutput`.
- `OutputApproved`: Payload contains `OutputID` and `FounderID`.
- `DecisionSuperseded`: Payload contains `OldDecisionID` and `NewDecisionID`.
- `SignalDetected`: Payload contains `MetricID` and `BreachValue`.

---

## 10. SEARCH CONTRACT ARCHITECTURE

- **Global Query Contract**:
  - *Input*: `SearchString`, `Filters` (Workspace, Date).
  - *Output*: `RankedResultsList` (Aggregated exact matches and semantic matches).
- **Context Retrieval Contract** (System internal):
  - *Input*: `VectorEmbedding`, `SimilarityThreshold`.
  - *Output*: Array of `DocumentChunks`.

---

## 11. INTELLIGENCE CONTRACT ARCHITECTURE

- **Metric Ingestion Contract**:
  - *Input*: `MetricName`, `Value`, `Timestamp`.
  - *Output*: `Acknowledgement` (Async processing).
- **Risk Generation Contract**:
  - *Input*: `SignalEvent`.
  - *Output*: `RiskPayload` (Description, Severity, ImpactedMissions).
- **Recommendation Contract**:
  - *Input*: `RiskPayload` + `ContextEnvelope`.
  - *Output*: `ProposedCommand` for the Founder to mitigate the risk.

---

## 12. AUTOMATION CONTRACT ARCHITECTURE

- **Workflow Trigger Contract**:
  - *Input*: `SystemEvent`.
  - *Output*: Array of matching `ActiveWorkflows`.
- **Workflow Execution Contract**:
  - *Input*: `MatchedWorkflow`, `EventPayload`.
  - *Output*: `ActionCommand` (e.g., Send API request to Mission Service to update Task status).

---

## 13. SECURITY CONTRACT ARCHITECTURE

- **Authorization Contract**:
  - *Input*: `ActionRequest`, `ActorToken`.
  - *Output*: `Boolean` (Is Authorized).
- **Isolation Contract**:
  - The fundamental security rule: An Agent Runtime has no API contract to query the database. It can only execute its `Agent Contract` and return a string.

---

## 14. CONTRACT GOVERNANCE ARCHITECTURE

- **Centralized Definition**: All contracts must exist in `packages/types`.
- **Versioning**: Contracts are immutable once deployed to production. If an event payload changes, it must be versioned (e.g., `TaskCompleted_v2`).
- **Backward Compatibility**: All new contract properties must be optional or provide fallback defaults.
- **Schema Validation**: Every API boundary utilizes a library (e.g., Zod) to enforce the contract at runtime. If a payload violates the contract, it is instantly dropped and an `InvalidContractEvent` is logged.

---

## 15. FINAL API BLUEPRINT

The EKVAAR OS API ecosystem is a deterministic hub-and-spoke model. The **Event Bus** sits at the center, distributing validated Contracts to **Subscribers** (Automation, Intelligence, Real-Time UI). The **KRISHNA Runtime** sits at the edge, converting stochastic human language into rigid, perfectly-typed **Command Contracts** that the system can execute without hallucination.
