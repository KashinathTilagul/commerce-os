# EKVAAR OS — P12 INTELLIGENCE & ANALYTICS ARCHITECTURE

## 1. INTELLIGENCE DEFINITION

**Definition:** Intelligence in EKVAAR OS is the automated synthesis of disjointed data (Metrics, Outputs, Signals) into predictive, actionable strategic truth.
**What it is NOT:** A chart showing "Revenue is ₹1M". That is just data.
**The Distinction:** 
- *Information* is what happened. 
- *Knowledge* is the rules of the company. 
- *Intelligence* is **why** it happened and **what** to do next.

---

## 2. INTELLIGENCE DOMAIN MAP

Intelligence is categorized by the domains it observes:
1. **Strategic Intelligence**: Macro trajectory (Are we achieving the Mission?).
2. **Execution/Operational Intelligence**: Workforce velocity (Are Agents blocked?).
3. **Financial Intelligence**: Capital efficiency (Burn rate, cash flow, ROI).
4. **Product & Supply Chain Intelligence**: Physical reality (Defect rates, vendor latency).
5. **Marketing & Customer Intelligence**: Acquisition (Brand sentiment, conversion costs).

---

## 3. METRIC ARCHITECTURE

**Definition:** A quantitative measurement of a specific state at a specific point in time.
**Classification:**
- **Leading Metrics**: Predictive indicators (e.g., Execution Velocity, Task Throughput).
- **Lagging Metrics**: Historical results (e.g., Revenue, Return Rate).
- **Diagnostic Metrics**: Root-cause indicators (e.g., Output Rejection Rate).

---

## 4. KPI ARCHITECTURE

**Relationship to Metrics:** All KPIs are metrics, but very few metrics are KPIs. A KPI is a metric that is mathematically bound to the success/failure of a specific Mission.
- **Company KPIs**: Global health (e.g., Gross Profit Margin).
- **Mission KPIs**: Goal-specific (e.g., "Luxe House Launch Date").
- **Agent KPIs**: Workforce health (e.g., "Output Acceptance Rate").

---

## 5. SIGNAL ARCHITECTURE

**What is a Signal:** A Signal is an anomaly. It is generated when a Metric mathematically deviates beyond standard historical variance or breaches a hard Founder-defined threshold.
**Examples:** A 15% drop in conversion rate, 3 consecutive failed Agent Outputs, cash reserves dropping below 3 months.
**Generation:** Signals trigger KRISHNA's Insight Generation Pipeline. Metrics are silent; Signals scream.

---

## 6. INSIGHT GENERATION PIPELINE

1. **Observe**: Telemetry constantly ingests raw Metrics.
2. **Detect**: The system identifies a Signal (e.g., "Return rates spiked 8%").
3. **Correlate**: KRISHNA's Context Engine queries the Knowledge Vault for causality (e.g., "Did we recently change the Return Policy Decision? Did we switch vendors?").
4. **Synthesize**: KRISHNA generates the Insight: *"Return rates spiked because the new Vendor X has a 12% sizing defect rate."*

---

## 7. RISK INTELLIGENCE ARCHITECTURE

**Identification:**
- **Execution Risk**: Identified when the Critical Path of a Mission DAG has multiple blocked nodes.
- **Financial Risk**: Identified when budget burn outpaces Task completion percentage.
**Surfacing:** High-severity risks bypass passive reporting and instantly generate a Critical Notification to the Founder.

---

## 8. OPPORTUNITY INTELLIGENCE ARCHITECTURE

**Identification:** Finding positive anomalies. Examples include identifying underutilized compute capacity (Agents sitting idle) or overperforming marketing channels.
**Ranking:** KRISHNA ranks opportunities based on a simple ROI heuristic: (Expected Capital/Velocity Impact) ÷ (Execution Effort Required).

---

## 9. BOTTLENECK DETECTION ARCHITECTURE

KRISHNA constantly monitors the Execution DAG to identify exactly *where* momentum is dying.
- **Decision Bottleneck**: Founder has 15 pending Outputs awaiting approval.
- **Agent Bottleneck**: Copywriter Agent is hitting API rate limits or failing syntax checks.
- **Knowledge Bottleneck**: Agents are failing Tasks because a specific Domain lacks a defining SOP Decision.

---

## 10. FORECASTING ARCHITECTURE

**What KRISHNA forecasts:** Mission completion dates and Capital runway.
**Architecture:** KRISHNA extrapolates current Execution Velocity (Tasks completed per day) against the remaining uncompleted nodes in the Mission DAG to mathematically predict if a deadline will slip.

---

## 11. RECOMMENDATION ENGINE

**When:** Delivered during the Morning Briefing or immediately following a Critical Signal.
**How generated:** Every Insight must map to a Recommendation. (Insight: "Vendor X has a 12% defect rate." Recommendation: "Propose Decision: Terminate Vendor X and route POs to Vendor Y.")
**Evaluation:** If the Founder approves, the Recommendation becomes a locked Decision. If rejected, it becomes a Negative Constraint to prevent KRISHNA from suggesting it again.

---

## 12. INTELLIGENCE DELIVERY MODEL

**Delivery Mechanism:** Intelligence is conversational and contextual. It is not a static PDF report sent every Friday.
KRISHNA delivers Intelligence verbally/textually during the Morning Briefing. If the Founder wants to see the visual proof of the Intelligence, they open the **Telemetry** or **Mission Control** apps.

---

## 13. INTELLIGENCE MEMORY MODEL

- **Validation**: Insights are hypotheses until the Founder validates them.
- **Storage**: Once the Founder agrees with an Insight ("Yes KRISHNA, Vendor X is the problem"), that Insight is converted into a Fact and locked into the Knowledge Vault.
- **Influence**: It permanently influences future DAG generation (KRISHNA will no longer route Tasks to Vendor X).

---

## 14. ANALYTICS ARCHITECTURE (TELEMETRY)

*(Note: Telemetry is one of the 3 V1 Core Applications defined in P3).*
**Purpose**: To allow the Founder to manually drill down into raw Metrics when KRISHNA's synthesized Insights are insufficient or require deep human intuition.
**Inputs**: Raw database streams from Shopify, Stripe, GitHub, and internal OS state.
**Outputs**: High-density, interactive visual data structures (graphs, heatmaps).

---

## 15. V1 INTELLIGENCE BLUEPRINT

To prevent the OS from turning into a bloated, over-engineered Business Intelligence tool, V1 imposes ruthless constraints:

- **No Predictive Forecasting**: V1 will not attempt to predict the future or calculate complex opportunity matrices.
- **No Automated Insight Generation**: V1 KRISHNA will not synthesize complex cross-domain insights. It will only surface explicit Signals (e.g., "Agent X failed 3 times").
- **Human-Derived Intelligence**: In V1, the Founder is the Intelligence Engine. KRISHNA provides the raw Data via the *Telemetry* app and the DAG state via the *Mission Control* app, and the Founder manually deduces the insights.
