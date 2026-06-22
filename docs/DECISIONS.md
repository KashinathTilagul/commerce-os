# EKVAAR OS — P9 DECISION ARCHITECTURE

## 1. DECISION DEFINITION

**Definition:** An explicit, irreversible (or highly constrained) rule that dictates how the company operates, builds, and behaves. It serves as a permanent architectural constraint on all system execution.
**Qualifies:** "Five House Architecture", "Six Color System", "Pricing Strategy: 40% Margin Minimum", "Return Policy: 30 Days".
**Does Not Qualify:** "Draft the summer email" (This is a Task), "Q3 Revenue dropped 5%" (This is a Metric), "We should probably focus on TikTok" (This is an Opinion/Insight).

---

## 2. DECISION TYPES

Decisions govern specific functional vectors of the OS:
- **Strategic Decisions**: Directional choices (e.g., "Expand to EU markets").
- **Brand Decisions**: Aesthetic/Identity rules (e.g., "Typography: Inter only").
- **Product Decisions**: Design/Manufacturing rules (e.g., "Sustainable sourcing only").
- **Operational Decisions**: Process rules (e.g., "Net-30 Vendor Terms").
- **Financial Decisions**: Capital thresholds (e.g., "No ad spend over ₹50k without review").
- **Legal Decisions**: Compliance and risk boundaries.

---

## 3. DECISION HIERARCHY

Decisions operate on a strict cascade of dominance:
- **Level 1 (Company Constitution)**: Unbreakable foundational pillars. Defines the brand identity.
- **Level 2 (Strategic Decisions)**: Macro direction. Guides Missions.
- **Level 3 (Domain Decisions)**: Function-specific rules. Guides Initiatives.
- **Level 4 (Project Decisions)**: Temporary local constraints. Guides Tasks.

---

## 4. DECISION LIFECYCLE

The state machine for governance:
1. **Proposed**: Initiated by Founder intent or an Agent discovering a repeating blocker.
2. **Under Review**: Suspended, awaiting Founder evaluation.
3. **Approved (Active)**: Locked into the Registry. Fully enforceable by KRISHNA.
4. **Superseded**: Replaced by a newer Decision (the old node is retained for history but loses enforcement authority).
5. **Deprecated (Archived)**: No longer enforced due to irrelevance.

---

## 5. DECISION OWNERSHIP

- **Create/Propose**: Anyone (Founders, KRISHNA, Agents) can *propose* a decision.
- **Review**: Founders or designated Leadership.
- **Approve**: Founders ONLY.
- **Revoke**: Founders ONLY.
- **Owns Company-Level**: The Founder is the ultimate sovereign of the Decision Registry.

---

## 6. DECISION AUTHORITY MODEL

- **Founder Authority**: Infinite. Can approve L1-L4 decisions. Can override the Constitution.
- **Leadership Authority**: Can approve L3-L4 decisions within their specific Domain workspace.
- **Agent Authority**: ZERO. Agents can never make decisions; they can only follow them or propose them when blocked.
- **KRISHNA Authority**: Can auto-approve minor L4 tactical decisions to keep execution moving, but must escalate L1-L3 proposals to the Founder.

---

## 7. DECISION REGISTRY ARCHITECTURE

- **Purpose**: The absolute single source of truth for company governance.
- **Structure**: An immutable append-only ledger (akin to a blockchain or hash-linked graph).
- **Versioning**: Decisions are never "edited". When a rule changes, a new Decision is appended that points to the deprecated one. This preserves the chain of logic so KRISHNA understands *why* the company pivoted.
- **Audit History**: Tracks who proposed it, when it was locked, and what Output/Task triggered it.
- **Searchability**: Semantically indexed and actively queried by KRISHNA's Context Engine before every Task.

---

## 8. DECISION RELATIONSHIP GRAPH

Decisions govern every downstream node in the Execution DAG:
- **Missions**: Bounded by *Strategic Decisions*.
- **Initiatives**: Guided by *Domain Decisions*.
- **Tasks**: Constrained by *Project Decisions*.
- **Outputs**: Evaluated strictly against *all* active Decisions in the hierarchy.
- **Knowledge**: Facts are prioritized based on proximity to a Decision.
- **Agents**: Decisions form the unalterable system prompt instructions that dictate Agent behavior.

---

## 9. DECISION ENFORCEMENT

- **Operating Rules**: When KRISHNA prepares a Task for an Agent, it queries the Decision Registry and injects all relevant Decisions into the Agent's "Context Envelope" as unbreakable system prompts.
- **Detection**: If an Agent's Output violates a Decision, KRISHNA's Reasoning Engine flags it as a logical syntax error.
- **Enforcement**: KRISHNA physically blocks the Output from reaching the "Pending Approval" state, forcing the Agent to retry the Task until it complies with the Decision.

---

## 10. DECISION CONFLICTS

- **Identification**: KRISHNA detects semantic collisions (e.g., "Decision A says spend ₹0, Decision B says spend ₹1000") during the pre-execution context fetch.
- **Resolution**: Resolved by strict Hierarchy evaluation (Level 1 always beats Level 3). If levels are equal, **Recency** wins (Newer supersedes older).
- **Final Determination**: If KRISHNA cannot resolve a Level 1 vs Level 1 conflict, it escalates to the Founder as a Critical Notification.

---

## 11. DECISION REVIEWS

- **Permanent**: Level 1 Constitutional decisions. They never expire unless the company pivots.
- **Periodically Reviewed**: Level 2 Strategic decisions (flagged for review during the Founder's Monthly Operating Rhythm).
- **Automatically Expire**: Level 4 Project decisions expire the moment the parent Project completes.

---

## 12. DECISION INTELLIGENCE

- **Planning**: KRISHNA will refuse to generate a Mission graph that violates a locked Decision (e.g., it will not plan a mass-market fast-fashion ad campaign if "Slow Fashion" is a Level 1 Decision).
- **Recommendations**: By analyzing Execution DAGs, KRISHNA identifies repeating bottlenecks. If Agents fail at the same Task 30% of the time, KRISHNA will proactively propose a new Operational Decision (SOP) to standardize the workflow.

---

## 13. COMPANY CONSTITUTION MODEL

- **Criteria**: A Level 1 Decision qualifies as Constitutional if altering it fundamentally changes the identity, legal structure, or core brand equity of the enterprise.
- **Examples**: Five House Architecture, Six Color System, House of Originals, Slow Fashion Positioning.
- **Protection**: Constitutional Decisions require a strict, multi-step confirmation protocol to supersede, preventing accidental destruction of brand equity by rogue Agent logic.

---

## 14. DECISION METRICS

Governance health is tracked by:
1. **Decision Quality**: How rarely a Decision needs to be superseded (high longevity = high quality).
2. **Decision Compliance**: The Output rejection rate specifically caused by Decision violations.
3. **Decision Velocity**: The time it takes from Proposal to Founder Approval.

---

## 15. V1 DECISION BLUEPRINT

To prevent the OS from sinking into bureaucratic governance logic, Version 1 strips out enforcement complexity:

- **Flat Hierarchy**: V1 will treat all Decisions equally as global constraints. The Level 1-4 hierarchy is deferred.
- **No Expiration**: All Decisions are permanent until manually revoked by the Founder.
- **Manual Enforcement**: KRISHNA will automatically inject Decisions into Agent prompts, but automated Output validation (KRISHNA blocking an output for non-compliance) is deferred. The Founder serves as the final manual enforcer during the Review stage.
- **Simple Registry**: The Decision Registry will be a simple appended Markdown list injected globally, avoiding complex ledger hashing in V1.
