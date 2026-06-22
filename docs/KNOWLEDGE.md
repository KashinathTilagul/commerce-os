# EKVAAR OS — P6 DATA & KNOWLEDGE ARCHITECTURE

## 1. KNOWLEDGE DOMAIN MAP

To organize EKVAAR OS memory efficiently without relying on traditional folder structures, knowledge is bounded by high-level Domains. The primary domains for the EKVAAR enterprise are:

1. **Brand Knowledge** (Aesthetic rules, tone of voice, visual identity)
2. **Product Knowledge** (Design files, materials, slow-fashion positioning)
3. **Supply Chain Knowledge** (Manufacturing processes, vendor relationships, logistics)
4. **Marketing Knowledge** (Campaigns, customer demographics, social strategy)
5. **Financial Knowledge** (Budgets, pricing models, capital allocation)
6. **Operational Knowledge** (Internal SOPs, system rules, Agent guidelines)
7. **Strategic Knowledge** (Missions, long-term goals, board decisions)

---

## 2. KNOWLEDGE HIERARCHY

Knowledge is not stored in rigid folders. It is a relational graph categorized by a strict semantic hierarchy:

1. **Domain**: The macro boundary (e.g., Brand Knowledge).
2. **Category**: A specific functional area (e.g., Visual Identity).
3. **Document**: A collection of related context meant for human reading (e.g., "The Six Color System Guidelines").
4. **Knowledge Node**: The invisible semantic building block that the system reads.

---

## 3. ATOMIC KNOWLEDGE OBJECT

The absolute smallest primitive object in the OS memory is the **Fact** (or **Knowledge Node**).

Everything reduces to a Fact. A Document is just a collection of Facts. A Decision is a Fact with a governance constraint. 
*Example:* "EKVAAR utilizes a 5-House brand architecture." This is a single, indivisible Knowledge Node.

---

## 4. KNOWLEDGE TYPES

Not all memory is equal. Knowledge is strictly typed:

- **Facts**: Immutable, objective data points (e.g., "Vendor X requires Net-30 payment").
- **Decisions**: Irreversible or highly constrained strategic choices.
- **Policies / SOPs**: Executable rules for Agents or Humans.
- **Strategies**: High-level directional intent guiding Missions.
- **Insights**: Inferences drawn automatically from Telemetry Metrics.
- **Negative Constraints (Lessons Learned)**: Rules explicitly defining what *not* to do, derived from failed/rejected Outputs.

---

## 5. DECISION ARCHITECTURE

EKVAAR OS already contains permanent Decisions (e.g., 5 House Architecture, Slow Fashion).

- **Storage**: Stored in the **Decision Registry**, an immutable append-only ledger isolated from general knowledge.
- **Versioning**: A Decision cannot be edited or deleted. It can only be superseded by a new Decision that explicitly deprecates the old one. This preserves institutional history.
- **Reference**: During execution, KRISHNA's Context Engine prioritizes the Decision Registry above all other knowledge. Decisions act as unbreakable constraints on Agents.
- **Permanence**: A Fact becomes a Decision only via explicit Founder approval ("KRISHNA, lock this decision.").

---

## 6. MEMORY ARCHITECTURE (LAYERS)

Memory degrades based on relevance to prevent system bloat.

1. **Conversational Memory (RAM)**: Ephemeral context of the current chat/voice session. Wiped when the interaction ends.
2. **Working Memory (L1 Cache)**: Context tied to an active Task or Project. Wiped when the final Output is approved.
3. **Company Memory (Storage)**: The active Knowledge Vault. Always searched.
4. **Historical Memory (Archive)**: Deprecated Decisions, completed Missions, and old Outputs. Not searched unless explicitly requested.

---

## 7. RETENTION RULES

- **Never Forgotten (Core Memory)**: Locked Decisions, Founder principles, Core Brand IP.
- **Can Be Forgotten**: Conversational pleasantries, Agent scratchpad reasoning, draft revisions.
- **Archived**: Completed Outputs, resolved Tasks, Meeting Transcripts older than 90 days.
- **Permanently Active**: Active SOPs, current Telemetry Metrics, Active Decisions.

---

## 8. KNOWLEDGE CREATION PIPELINE

How new knowledge enters the system without manual data entry:

1. **Action**: A Meeting concludes, an Output is approved, or an Intent is spoken.
2. **Synthesis**: KRISHNA silently runs a background parsing job to extract raw Facts, Insights, and Action Items.
3. **Draft**: KRISHNA proposes new Knowledge Nodes to be written.
4. **Validation**: The system auto-approves routine Facts, but flags strategic changes for Founder approval.
5. **Index**: The Node is permanently embedded into the Knowledge Vault.

---

## 9. KNOWLEDGE VALIDATION MODEL

Not all ingested information is truth.

- **Trust Hierarchy**: Explicit Founder Command > Approved Output > Agent Research.
- **Conflict Resolution**: If KRISHNA attempts to ingest a Fact that contradicts an existing Decision, it halts and triggers a "Knowledge Conflict" notification. The Founder must manually resolve which truth prevails.
- **Outdated Information**: When a conflict is resolved in favor of new data, the old node is tagged `[DEPRECATED]` and moved to Historical Memory.

---

## 10. KNOWLEDGE RELATIONSHIP GRAPH

The cognitive mapping of how memory influences execution:

- **Decision** `constrains` (Task, Agent).
- **Approved Output** `synthesizes into` **Knowledge Node**.
- **Knowledge Node** `informs` **Reasoning Engine**.
- **Metric** `validates` **Insight**.
- **Insight** `prompts` **Decision**.
- **Negative Constraint** `prevents` **Failed Output**.

---

## 11. RETRIEVAL ARCHITECTURE

When KRISHNA receives an intent ("Draft the Q3 Brand Update"):

1. **Search Order**: Decision Registry (Rules) → Active Company Memory (Facts) → Historical Memory (Past Examples).
2. **Relevance**: Determined by proximity to the current Workspace Domain, semantic similarity to the prompt, and temporal recency.
3. **Conflict Handling**: If two active knowledge nodes conflict, the one with a `Decision` tag wins. If both are standard Facts, the most recent timestamp wins.

---

## 12. FOUNDER MEMORY MODEL

EKVAAR OS adapts to the Founder, not the other way around.

- **Preserved Decisions**: All explicit operational rules stated by the Founder are locked.
- **Preserved Preferences**: When a Founder rejects an Output ("Make this more concise, I hate long emails"), KRISHNA extracts the rejection reason and saves it as a permanent Founder Preference Constraint.
- **Operating Patterns**: KRISHNA silently logs when the Founder is most active (e.g., Morning approvals, Evening brain dumps) to optimize notification timing.

---

## 13. ORGANIZATIONAL LEARNING MODEL

How the OS gets smarter without human training:

- **Failures into Lessons**: Every time an Agent Output is rejected, KRISHNA generates a "Negative Constraint" node.
- **Success into Reusability**: Every time an Output is highly praised or approved with zero edits, KRISHNA tags it as a "Gold Standard Template" for future Agents to mimic.
- **Prevention**: Before an Agent begins a Task, the Context Engine specifically queries for Negative Constraints related to that Task type, ensuring a mistake is never repeated twice.

---

## 14. KNOWLEDGE VAULT ARCHITECTURE

- **Purpose**: The central semantic database and single source of truth for all company context.
- **Contents**: Documents, Knowledge Nodes, Decisions, Templates, and Metrics history.
- **Ownership**: The System.
- **Structure**: A flat graph of interconnected vector embeddings bounded by Domains (No traditional folders).
- **Permissions**: Read-only for Agents. Read/Write for Founder.
- **Searchability**: Full semantic vector search via KRISHNA or global shortcut.
- **Lifecycle**: Draft → Active → Superseded → Historical.

---

## 15. V1 KNOWLEDGE BLUEPRINT

To ensure V1 launches successfully without buckling under architectural complexity, we apply ruthless constraints:

- **No Automated Meeting Extraction**: V1 will rely on the Founder explicitly dictating memory ("KRISHNA, remember that X is Y").
- **Two Memory Layers Only**: V1 implements only Working Memory (RAM) and Company Memory (Storage). Historical archiving is deferred.
- **Manual Conflict Resolution**: V1 will not attempt to auto-resolve contradictory facts. It will simply overwrite the old fact based on chronological recency.
- **Simple Preferences**: Learning is explicit. The Founder must say, "Rule: Always do X." Implicit preference learning via Output rejection analysis is deferred to V2.
