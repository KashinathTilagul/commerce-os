# EKVAAR OS — P19 VIRTUAL HQ ARCHITECTURE

## 1. VIRTUAL HQ DEFINITION

**Definition:** Virtual HQ is the spatial, topological representation of EKVAAR as a living organization. It is a structural map of the company's current operational state, showing *where* work is happening and *who* is doing it.
**Why it exists:** To give the Founder a concrete mental model of a digital workforce. Without it, the OS is just a flat list of tasks.
**What it must never become:** A 3D metaverse, a video game, or a skeuomorphic simulation with animated avatars "walking" down digital hallways.

---

## 2. SPATIAL PHILOSOPHY

Virtual HQ maps **Functions (Departments)** as persistent geographic territories, and **Missions** as transient structures built within them. 
It does not represent physical geometry; it represents *Cognitive Context*. When you enter a space, the data, agents, and metrics irrelevant to that space are filtered out.

---

## 3. CORE SPACES

The organization is divided into specific permanent domains:
1. **The Founder's Office**: The root node. Total visibility, pure strategy.
2. **The Brand & Creative Wing**: Where marketing, design, and identity exist.
3. **The Product & Supply Wing**: Where manufacturing, inventory, and logistics exist.
4. **The Finance & Operations Wing**: Where capital, accounting, and legal exist.
5. **The Knowledge Vault (The Library)**: The immutable archive of Decisions and Facts.
6. **Mission Control (The War Room)**: The tactical center for cross-departmental execution.

---

## 4. FOUNDER OFFICE ARCHITECTURE

- **Purpose**: A private, high-altitude control nexus.
- **Visibility**: Can see into every other Wing, but Agents cannot "see" into the Founder's Office.
- **Interactions**: This is where the Founder converses privately with KRISHNA to establish Level 1 and 2 Constitutional Decisions.
- **Objects**: Contains global company KPIs and pending strategic Approvals.

---

## 5. DEPARTMENT ARCHITECTURE

- **How they appear**: A persistent contextual domain (e.g., entering the "Brand Wing").
- **Information Exposed**: Department-specific Metrics (e.g., CPA, ROAS), locked domain Decisions, and a list of active Missions assigned to this function.
- **Activity**: You can observe the specific Agents assigned to this Wing actively processing Tasks.

---

## 6. AGENT PRESENCE MODEL

Agents do not have 3D bodies. They have **Operational State Nodes**.
- **Presence**: An Agent "exists" in the Wing where its current Task is categorized.
- **Availability**: Indicated by a rigid state enum: `[Idle]`, `[Executing: Task_Name]`, or `[Blocked: Awaiting_Approval]`.
- **Workload**: Visualized by the depth of the Task queue assigned to that Agent's node. 

---

## 7. HUMAN PRESENCE MODEL

- **Appearance**: In V1, the Founder is the only human. Their presence is represented by their active Context (Workspace).
- **Visibility**: If the Founder is in the "Finance Wing," KRISHNA knows the Founder's current cognitive state is analytical, adjusting the urgency and type of background notifications accordingly.

---

## 8. MEETING ARCHITECTURE

- **Spatial Representation**: Meetings are explicit, synchronous "Rooms."
- **The War Room**: Formed when a Mission Critical Path is blocked. KRISHNA pulls the relevant Agent nodes, the specific blocked Task, and the Founder into a temporary, isolated context to force a resolution. Once unblocked, the Room dissolves.

---

## 9. MISSION SPACE ARCHITECTURE

**Transient Architecture:**
- Missions, Initiatives, and Projects are not permanent wings. They are transient "Rooms" built *inside* a Department Wing. 
- When the "Summer Campaign Launch" Mission is created, a Room is spawned in the Brand Wing. Relevant Agents are pulled inside. When the Mission completes, the Room is deconstructed and archived into the Knowledge Vault.

---

## 10. NAVIGATION ARCHITECTURE

- **Traversal**: Logical, tree-based traversal. Global (HQ) → Function (Brand Wing) → Mission (Summer Campaign) → Node (Task).
- **Discovery**: Users do not "walk" to find things. They use deterministic Search (`CMD+K`) to instantly teleport to a specific node, or they ask KRISHNA to take them to the bottleneck.

---

## 11. COLLABORATION ARCHITECTURE

- **Mechanism**: Collaboration in Virtual HQ is achieved by grouping entities into a shared Context space.
- **Agent/Human**: If the Copywriter Agent is struggling, the Founder "enters" the Mission Room. The Founder views the Agent's scratchpad reasoning in real-time, adjusts the Prompt Envelope, and watches the Agent re-execute.

---

## 12. PRESENCE INTELLIGENCE MODEL

- **Activity Tracking**: KRISHNA monitors where compute cycles are being spent geographically across the HQ.
- **Bottleneck Insight**: KRISHNA can generate intelligence like: *"Sir, 80% of our active Agents are currently congested in the Product Wing waiting on Vendor API responses, while the Brand Wing is completely idle."*

---

## 13. HQ BOUNDARY DEFINITION

- **What belongs inside**: Topologies, execution graphs, agent states, contextual metrics.
- **What must never appear**: Skeuomorphic office desks, virtual water coolers, spatial audio, or 3D avatars. Virtual HQ is a data visualization of the Org Chart and the Execution DAG merged together.

---

## 14. RELATIONSHIP WITH APPLICATIONS

Virtual HQ is the **Lens**.
- **Mission Control**: The literal graph of the Tasks.
- **Virtual HQ**: The mapping of *who* (Agents) is working on those Tasks, and *where* those Tasks live within the company structure. HQ is how you filter Mission Control and the Knowledge Vault by Department Context.

---

## 15. V1 VIRTUAL HQ BLUEPRINT

To prevent the project from devolving into a complex UI rendering nightmare, Version 1 imposes a brutal constraint:

- **No Graphical Maps**: V1 Virtual HQ will be rendered entirely via text, structured JSON hierarchies, and clean node lists. 
- **Context Filters**: Virtual HQ in V1 is essentially a highly-advanced "Filter" system. Clicking "Brand Wing" simply filters the Mission Control DAG, the Metrics array, and the active Agent list down to that specific domain.
- **The Core Illusion**: The spatial feeling is created by KRISHNA's language (*"Entering the Brand Wing, Sir"*), not by 3D graphics.
