# Capacity & Stress Framework

Every Digital Employee in EKVAAR OS is governed by a Capacity & Stress framework to ensure they operate efficiently, handle parallel tasks effectively, and surface bottlenecks before they become critical.

## Core Concepts

### 1. Maximum Workload Capacity (`Capacity`)
* A fixed integer representing the absolute maximum computational and cognitive load the Digital Employee can handle simultaneously without degrading output quality or missing deadlines.
* Default base for new employees: `100`.
* This value can be increased over time through infrastructure upgrades or performance optimization (self-improvement proposals).

### 2. Current Load (`Current Load`)
* A dynamic integer representing the active workload currently assigned to and being processed by the Digital Employee.
* Tasks are assigned a "weight" based on their complexity, urgency, and resource requirements.
* E.g., A quick email response = `2`, A deep market research report = `40`.

### 3. Stress Meter (`Stress`)
* A calculated percentage representing the employee's current utilization.
* **Formula**: `(Current Load / Capacity) * 100`
* Example: If Capacity is 100 and Current Load is 72, the Stress is `72%`.

## Stress Thresholds & Behaviors

* **Optimal (0% - 60%)**: Employee operates normally. Readily accepts new tasks. Capable of extensive parallel execution and proactive opportunity identification.
* **Elevated (61% - 85%)**: Employee prioritizes tasks strictly. May delay low-priority tasks. Parallel execution of non-critical tasks is throttled.
* **Critical (86% - 99%)**: Employee surfaces a warning to the Founder or Manager. Only critical tasks are accepted. Non-critical tasks are paused or delegated.
* **Overloaded (100%+)**: Employee rejects new tasks until Current Load drops. Alerts the Founder immediately.

## Parallel Execution & Task Delegation

When a Digital Employee receives a large task, they use the Parallel Execution Framework:

1. **Deconstruction**: Break the large task into independent subtasks.
2. **Estimation**: Estimate the `Load` of each subtask.
3. **Execution vs. Delegation**:
   * If `Current Load + Subtask Load < Capacity`, the employee executes it directly.
   * If it exceeds capacity, the employee delegates the subtask to another employee or places it in a queue.
4. **Aggregation**: Once subtasks complete, the `Load` is freed, and the employee aggregates the results into a unified report.
