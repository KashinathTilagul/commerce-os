# EKVAAR OS — P10 ORGANIZATIONAL STRUCTURE ARCHITECTURE

## 1. ORGANIZATION DEFINITION

**Definition:** The Organization is the root container object of EKVAAR OS. It represents the legal, financial, and strategic boundary of the enterprise.
**Properties:** Total Capital, Total Compute (Agent Throughput), Active Missions.
**Relationships:** It owns all Domains, Knowledge, and Decisions. It is constrained strictly by Level 1 Constitutional Decisions.
**Responsibilities:** Accumulating value, preserving brand equity, and achieving the founding Mission.

---

## 2. ORGANIZATIONAL UNIT ARCHITECTURE

Bureaucratic structures like "Divisions" or "Business Units" are abolished. EKVAAR OS operates strictly on two organizational units:
1. **Department (Permanent)**: A bounded context for Knowledge and Decisions.
2. **Team (Temporary)**: A fluid assembly of resources executing a specific goal.

---

## 3. DEPARTMENT ARCHITECTURE

**Purpose:** To cluster specialized Knowledge, Decisions, and Metrics into a bounded cognitive context (Domain).
**Examples:** Brand, Product, Supply Chain, Finance, Growth.
**Ownership:** Department Lead (or Founder).
**Responsibilities:** Maintaining the purity of the domain's Knowledge Vault and ensuring Domain Decisions are upheld.
**Relationships:** Departments do NOT own people or agents. They only own Information and Rules.

---

## 4. TEAM ARCHITECTURE

**How created:** Teams do not exist permanently. They are dynamically assembled by KRISHNA when a *Project* is spawned.
**How they relate to departments:** Teams are cross-functional. KRISHNA pulls resources from multiple domains (e.g., a Brand Agent and a Supply Chain Specialist) into a temporary Team.
**How they evolve/work:** When the Project completes, the Team instantly dissolves. The resources are returned to the global pool. There are no "permanent teams."

---

## 5. ROLE ARCHITECTURE

A Person is an identity. A Role is an access-control permission mask.
**Roles:**
- **Founder**: Infinite authority.
- **Leadership**: Domain authority.
- **Specialist**: Task authority.
- **Vendor**: Output authority.
*(Note: "Manager" is abolished. KRISHNA manages. Humans specialize).*

---

## 6. REPORTING ARCHITECTURE

- **Human to Human**: Specialists report to Leadership.
- **Agents**: Agents do NOT report to Humans. Agents report directly to KRISHNA.
- **KRISHNA**: KRISHNA reports directly to the Founder.
- Humans provide Intent. KRISHNA manages the execution workforce.

---

## 7. EXTERNAL ENTITY ARCHITECTURE

**Examples:** Manufacturers, Logistics Providers, Design Agencies.
**Inside the OS:** External Entities exist as isolated "External Nodes." 
**Differences:** They do not own Tasks inside the OS. They receive finalized *Outputs* (e.g., a Purchase Order PDF) via APIs/Email, and they provide *Inputs* (e.g., an Invoice) which KRISHNA ingests into the Knowledge Vault.

---

## 8. AGENT PLACEMENT

**Where agents belong:** **KRISHNA-owned.**
Departments and Teams do not "own" Agents. KRISHNA maintains a global, liquid pool of specialized digital workers. When a Project requires a copywriter, KRISHNA routes the Task to the Copywriter Agent temporarily, then reallocates it the millisecond the Task completes.

---

## 9. ORGANIZATIONAL RELATIONSHIP GRAPH

- **Organization** `contains` **Departments**.
- **Department** `bounds` **Knowledge** & **Decisions**.
- **Project** `assembles` **Team**.
- **KRISHNA** `manages` **Agents**.
- **Role** `grants access to` **Person**.
- **Team** `executes` **Mission**.

---

## 10. CAPACITY ARCHITECTURE

- **Organizational Capacity**: Measured purely by available Financial Capital.
- **Team Capacity**: Irrelevant (teams are temporary).
- **Agent Capacity**: Measured by API rate limits, token throughput, and KRISHNA compute bandwidth.
- **Execution Load**: Measured by the ratio of Active vs Blocked nodes in the Execution DAG.

---

## 11. VISIBILITY ARCHITECTURE

- **Founder**: Global Root (Sees the entire DAG).
- **Leadership**: Domain Visibility (Sees all Projects touching their Department).
- **Employees/Specialists**: Task Visibility (Sees ONLY the Knowledge specifically required to complete their assigned Task).
- **Vendors**: Output Visibility (Sees only finalized documents shared with them).
- **Agents**: Context Envelope (Sees absolutely nothing except what KRISHNA explicitly injects into the prompt for that specific micro-task).

---

## 12. ORGANIZATIONAL CHANGE MODEL

- **Creating Departments**: The Founder declares a new Domain in the Knowledge Vault.
- **Reorganizing Teams**: Instantaneous. Since teams are project-based, reorganizations don't require HR shifts; KRISHNA simply routes Tasks to different people tomorrow.
- **Historical Structures**: Preserved via the Decision Registry (e.g., "On X date, Finance split from Ops").

---

## 13. ORGANIZATIONAL INTELLIGENCE

**How KRISHNA understands the organization:** By analyzing the Execution DAG against the Role structure.
**Identifying Bottlenecks:** KRISHNA flags if a specific Person (e.g., the Founder) is the bottleneck for 80% of Output approvals.
**Recommendations:** If KRISHNA routes a Task and no Agent or Human has the required skills, it flags a "Capability Gap" and recommends the Founder authorize the spawning of a new Agent or hiring a Vendor.

---

## 14. VIRTUAL HQ DEPENDENCIES

*(Virtual HQ is the spatial visualization of the company).*
**Information Required:** Current active Projects, Online Status of Humans, Agent Status (Active/Idle).
**Objects Represented:** Execution DAG nodes mapped to spatial coordinates.
**Dependencies:** Relies entirely on the Execution State Engine and the Entity Directory. Virtual HQ is merely a read-only visual skin over the DAG.

---

## 15. V1 ORGANIZATIONAL BLUEPRINT

To avoid enterprise HR bureaucracy, Version 1 of EKVAAR OS will launch with an extremely ruthless, flat structure:

- **Departments**: Zero. The company operates as a single, unified Knowledge domain.
- **Roles**: **Founder Only**. There are no employees, no leadership tiers, and no vendors inside the system yet.
- **Teams**: Zero. 
- **Agents**: A single, global KRISHNA-owned generalist agent.
- **Visibility**: 100% Global Root access.
- **Summary**: V1 is designed strictly as a one-to-one symbiosis between the Founder (Intent) and KRISHNA (Execution). Multi-user routing and complex department bounding are deferred to V2.
