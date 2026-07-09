"""
core.database – async SQLite helpers for the Ekvaar back-end.

Uses aiosqlite for non-blocking database access with connection pooling.
Call ``await init_db()`` once at startup to create every table.
"""

from __future__ import annotations

import os
import pathlib
import asyncio
import logging
from typing import Any, Optional, Sequence

import aiosqlite

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

_MODULE_DIR = pathlib.Path(__file__).resolve().parent          # …/core
_BACKEND_DIR = _MODULE_DIR.parent                              # …/backend-py
_DATA_DIR = _BACKEND_DIR / "data"
_DB_FILE = _DATA_DIR / "ekvaar_business.db"


def get_db_path() -> pathlib.Path:
    """Return the absolute ``Path`` to the SQLite database file."""
    return _DB_FILE


# ---------------------------------------------------------------------------
# Low-level connection helper
# ---------------------------------------------------------------------------

async def _connect() -> aiosqlite.Connection:
    """Open (or create) the database and enable WAL + foreign keys."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(_DB_FILE))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL;")
    await db.execute("PRAGMA foreign_keys=ON;")
    return db


# ---------------------------------------------------------------------------
# Connection Pool for concurrent access
# ---------------------------------------------------------------------------

class DatabasePool:
    """Async connection pool for SQLite database.

    Maintains a pool of reusable connections to reduce connection overhead
    and prevent database lock contention.
    """

    def __init__(self, pool_size: int = 5):
        self.pool_size = pool_size
        self.available = asyncio.Queue(maxsize=pool_size)
        self.in_use = set()
        self._initialized = False

    async def initialize(self):
        """Create initial pool connections."""
        if self._initialized:
            return
        for _ in range(self.pool_size):
            conn = await _connect()
            await self.available.put(conn)
        self._initialized = True
        logger.info(f"Database pool initialized with {self.pool_size} connections")

    async def acquire(self) -> aiosqlite.Connection:
        """Acquire a connection from the pool or create a new one."""
        try:
            conn = self.available.get_nowait()
        except asyncio.QueueEmpty:
            conn = await _connect()
        self.in_use.add(conn)
        return conn

    async def release(self, conn: aiosqlite.Connection):
        """Return a connection to the pool."""
        self.in_use.discard(conn)
        try:
            self.available.put_nowait(conn)
        except asyncio.QueueFull:
            await conn.close()
            logger.debug("Pool full, closed excess connection")

    async def close_all(self):
        """Close all connections in the pool."""
        while True:
            try:
                conn = self.available.get_nowait()
                await conn.close()
            except asyncio.QueueEmpty:
                break
        for conn in self.in_use:
            await conn.close()
        logger.info("All database connections closed")

    async def __aenter__(self):
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close_all()


_pool: Optional[DatabasePool] = None


def get_pool() -> DatabasePool:
    """Get the global database pool instance."""
    global _pool
    if _pool is None:
        _pool = DatabasePool()
    return _pool


# ---------------------------------------------------------------------------
# Public query helpers - use connection pool
# ---------------------------------------------------------------------------

async def db_all(
    sql: str,
    params: Sequence[Any] = (),
) -> list[dict[str, Any]]:
    """Execute *sql* and return **all** rows as a list of dicts."""
    pool = get_pool()
    conn = await pool.acquire()
    try:
        cursor = await conn.execute(sql, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await pool.release(conn)


async def db_get(
    sql: str,
    params: Sequence[Any] = (),
) -> Optional[dict[str, Any]]:
    """Execute *sql* and return the **first** row as a dict, or ``None``."""
    pool = get_pool()
    conn = await pool.acquire()
    try:
        cursor = await conn.execute(sql, params)
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await pool.release(conn)


async def db_run(
    sql: str,
    params: Sequence[Any] = (),
) -> int:
    """Execute *sql* (INSERT / UPDATE / DELETE), commit, and return ``lastrowid``."""
    pool = get_pool()
    conn = await pool.acquire()
    try:
        cursor = await conn.execute(sql, params)
        await conn.commit()
        return cursor.lastrowid
    finally:
        await pool.release(conn)


# ---------------------------------------------------------------------------
# Schema bootstrap
# ---------------------------------------------------------------------------

_SCHEMA_SQL = """
-- ===================================================================
-- SHOPIFY-SOURCE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    handle          TEXT,
    vendor          TEXT,
    type            TEXT,
    status          TEXT,
    tags            TEXT,
    created_at      TEXT,
    updated_at      TEXT,
    raw_payload     TEXT
);

CREATE TABLE IF NOT EXISTS variants (
    id                  TEXT PRIMARY KEY,
    product_id          TEXT REFERENCES products(id),
    sku                 TEXT,
    title               TEXT,
    price               REAL,
    inventory_quantity   INTEGER,
    option1             TEXT,
    option2             TEXT,
    option3             TEXT,
    barcode             TEXT,
    weight              REAL,
    weight_unit         TEXT,
    created_at          TEXT,
    updated_at          TEXT,
    raw_payload         TEXT
);

CREATE TABLE IF NOT EXISTS collections (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    handle          TEXT,
    description     TEXT,
    published_at    TEXT,
    created_at      TEXT,
    updated_at      TEXT,
    raw_payload     TEXT
);

CREATE TABLE IF NOT EXISTS collection_products (
    collection_id   TEXT NOT NULL REFERENCES collections(id),
    product_id      TEXT NOT NULL REFERENCES products(id),
    PRIMARY KEY (collection_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
    order_number        TEXT,
    email               TEXT,
    created_at          TEXT,
    total_price         REAL,
    currency            TEXT,
    financial_status    TEXT,
    fulfillment_status  TEXT,
    customer_id         TEXT,
    raw_payload         TEXT
);

CREATE TABLE IF NOT EXISTS order_line_items (
    id          TEXT PRIMARY KEY,
    order_id    TEXT REFERENCES orders(id),
    variant_id  TEXT REFERENCES variants(id),
    product_id  TEXT REFERENCES products(id),
    title       TEXT,
    quantity    INTEGER,
    price       REAL
);

CREATE TABLE IF NOT EXISTS customers (
    id              TEXT PRIMARY KEY,
    email           TEXT,
    first_name      TEXT,
    last_name       TEXT,
    orders_count    INTEGER,
    total_spent     REAL,
    raw_payload     TEXT
);

CREATE TABLE IF NOT EXISTS returns (
    id          TEXT PRIMARY KEY,
    order_id    TEXT,
    status      TEXT,
    created_at  TEXT,
    raw_payload TEXT
);

CREATE TABLE IF NOT EXISTS inventory_events (
    id                  TEXT PRIMARY KEY,
    product_id          TEXT,
    variant_id          TEXT,
    quantity_available   INTEGER,
    updated_at          TEXT,
    raw_payload         TEXT
);

-- ===================================================================
-- EKVAAR-NATIVE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS inventory_policies (
    policy_id        TEXT PRIMARY KEY,
    variant_id       TEXT REFERENCES variants(id),
    type             TEXT,
    threshold        INTEGER,
    reorder_quantity INTEGER,
    supplier_id      TEXT,
    created_at       TEXT
);

CREATE TABLE IF NOT EXISTS trends (
    trend_id        TEXT PRIMARY KEY,
    trend_type      TEXT,
    score           REAL,
    period          TEXT,
    confidence      REAL,
    delta           REAL,
    previous_score  REAL,
    computed_at     TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
    decision_id         TEXT PRIMARY KEY,
    title               TEXT,
    decision_type       TEXT,
    priority            TEXT,
    status              TEXT DEFAULT 'PENDING',
    justification       TEXT,
    source_entity_id    TEXT,
    source_entity_type  TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS missions (
    mission_id  TEXT PRIMARY KEY,
    title       TEXT,
    objective   TEXT,
    status      TEXT DEFAULT 'PLANNED',
    owner       TEXT,
    decision_id TEXT REFERENCES decisions(decision_id),
    start_date  TEXT,
    end_date    TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS mission_targets (
    mission_id  TEXT NOT NULL REFERENCES missions(mission_id),
    product_id  TEXT NOT NULL REFERENCES products(id),
    PRIMARY KEY (mission_id, product_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    task_id     TEXT PRIMARY KEY,
    title       TEXT,
    description TEXT,
    status      TEXT DEFAULT 'TODO',
    assigned_to TEXT,
    due_date    TEXT,
    mission_id  TEXT REFERENCES missions(mission_id),
    decision_id TEXT REFERENCES decisions(decision_id),
    agent_id    TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS agents (
    agent_id              TEXT PRIMARY KEY,
    name                  TEXT,
    capability            TEXT,
    status                TEXT DEFAULT 'IDLE',
    current_mission_id    TEXT,
    active_task_id        TEXT,
    last_output_id        TEXT,
    memory_context_json   TEXT,
    execution_queue_json  TEXT,
    created_at            TEXT
);

CREATE TABLE IF NOT EXISTS plans (
    plan_id             TEXT PRIMARY KEY,
    task_id             TEXT REFERENCES tasks(task_id),
    agent_id            TEXT REFERENCES agents(agent_id),
    title               TEXT,
    status              TEXT DEFAULT 'DRAFT',
    steps_json          TEXT,
    approval_required   INTEGER DEFAULT 1,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS outputs (
    output_id    TEXT PRIMARY KEY,
    agent_id     TEXT REFERENCES agents(agent_id),
    task_id      TEXT REFERENCES tasks(task_id),
    plan_id      TEXT REFERENCES plans(plan_id),
    title        TEXT,
    content_json TEXT,
    created_at   TEXT
);

CREATE TABLE IF NOT EXISTS founder_inbox (
    id TEXT PRIMARY KEY,
    source_type TEXT,
    source_id TEXT,
    category TEXT,
    priority TEXT,
    title TEXT,
    summary TEXT,
    recommended_action TEXT,
    approve_consequence TEXT,
    ignore_consequence TEXT,
    deep_link TEXT,
    payload_json TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT,
    resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS founder_inbox_history (
    history_id TEXT PRIMARY KEY,
    inbox_id TEXT REFERENCES founder_inbox(id),
    action_taken TEXT,
    actor TEXT,
    previous_status TEXT,
    new_status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    source TEXT,
    title TEXT,
    body TEXT,
    severity TEXT,
    read_at TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS knowledge (
    knowledge_id TEXT PRIMARY KEY,
    output_id    TEXT REFERENCES outputs(output_id),
    title        TEXT,
    category     TEXT,
    content      TEXT,
    created_at   TEXT
);

CREATE TABLE IF NOT EXISTS notes_entries (
    id              TEXT PRIMARY KEY,
    type            TEXT,
    title           TEXT,
    content         TEXT,
    transcription   TEXT,
    category        TEXT,
    tags_json       TEXT,
    extracted_json  TEXT,
    created_at      TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS conversation_threads (
    id                TEXT PRIMARY KEY,
    channel           TEXT,
    title             TEXT,
    participant_name  TEXT,
    unread            INTEGER DEFAULT 0,
    last_message_at   TEXT,
    created_at        TEXT,
    updated_at        TEXT
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id          TEXT PRIMARY KEY,
    thread_id   TEXT REFERENCES conversation_threads(id),
    sender      TEXT,
    body        TEXT,
    direction   TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id           TEXT PRIMARY KEY,
    calendar_id  TEXT,
    title        TEXT,
    starts_at    TEXT,
    ends_at      TEXT,
    location     TEXT,
    description  TEXT,
    status       TEXT,
    created_at   TEXT,
    updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS media_tracks (
    id           TEXT PRIMARY KEY,
    playlist     TEXT,
    title        TEXT,
    artist       TEXT,
    duration     TEXT,
    src          TEXT,
    art          TEXT,
    embed_url    TEXT,
    source_type  TEXT,
    created_at   TEXT,
    updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    source      TEXT,
    title       TEXT,
    body        TEXT,
    severity    TEXT,
    read_at     TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS ui_actions (
    id            TEXT PRIMARY KEY,
    app_id        TEXT,
    action        TEXT,
    payload_json  TEXT,
    created_at    TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id     TEXT PRIMARY KEY,
    name            TEXT,
    contact_email   TEXT,
    lead_time_days  INTEGER,
    preferred       INTEGER DEFAULT 0,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS sync_log (
    sync_id             TEXT PRIMARY KEY,
    source_system       TEXT,
    started_at          TEXT,
    completed_at        TEXT,
    records_processed   INTEGER,
    status              TEXT,
    error_message       TEXT
);

CREATE TABLE IF NOT EXISTS graph_entities (
    id              TEXT PRIMARY KEY,
    entity_type     TEXT,
    source_system   TEXT,
    source_id       TEXT,
    title           TEXT,
    metadata_json   TEXT,
    created_at      TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS graph_relationships (
    id                  TEXT PRIMARY KEY,
    relationship_type   TEXT,
    source_entity_id    TEXT,
    target_entity_id    TEXT,
    metadata_json       TEXT,
    created_at          TEXT
);

-- ===================================================================
-- WORKFORCE ENGINE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS workforce_messages (
    message_id      TEXT PRIMARY KEY,
    sender          TEXT,
    receiver        TEXT,
    priority        TEXT,
    status          TEXT,
    correlation_id  TEXT,
    content         TEXT,
    timestamp       TEXT
);

CREATE TABLE IF NOT EXISTS workforce_tasks (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT,
    owner           TEXT,
    reviewer        TEXT,
    department      TEXT,
    priority        TEXT,
    status          TEXT,
    title           TEXT,
    description     TEXT,
    due_date        TEXT,
    created_at      TEXT,
    updated_at      TEXT
);

CREATE TABLE IF NOT EXISTS workforce_approvals (
    id              TEXT PRIMARY KEY,
    task_id         TEXT,
    requester       TEXT,
    approver        TEXT,
    reason          TEXT,
    impact          TEXT,
    risk            TEXT,
    decision        TEXT,
    rationale       TEXT,
    timestamp       TEXT
);

CREATE TABLE IF NOT EXISTS workforce_escalations (
    id              TEXT PRIMARY KEY,
    source_id       TEXT,
    level           TEXT,
    reason          TEXT,
    status          TEXT,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS workforce_experiences (
    id              TEXT PRIMARY KEY,
    task_id         TEXT,
    employee_id     TEXT,
    content         TEXT,
    status          TEXT,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS workforce_knowledge (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    content         TEXT,
    author          TEXT,
    status          TEXT,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS workforce_memory (
    id              TEXT PRIMARY KEY,
    type            TEXT,
    content         TEXT,
    metadata_json   TEXT,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS workforce_health (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT,
    stress_level    REAL,
    capacity        REAL,
    active_tasks    INTEGER,
    timestamp       TEXT
);

-- ===================================================================
-- CEO DECISION ENGINE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS ceo_decisions (
    id                  TEXT PRIMARY KEY,
    objective           TEXT,
    recommended_option  TEXT,
    confidence_score    REAL,
    risk_score          REAL,
    impact_score        REAL,
    approval_level      TEXT,
    reasoning           TEXT,
    requires_founder    INTEGER,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS ceo_decision_options (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    description         TEXT,
    pros                TEXT,
    cons                TEXT
);

CREATE TABLE IF NOT EXISTS ceo_simulations (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    scenario_type       TEXT,
    scenario_desc       TEXT,
    outcome             TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS ceo_decision_memory (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    outcome_actual      TEXT,
    success_score       REAL,
    lessons_learned     TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS ceo_decision_audits (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    trace_data_json     TEXT,
    who                 TEXT,
    outcome             TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS ceo_decision_reviews (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    review_date         TEXT,
    is_correct          INTEGER,
    prediction_accurate INTEGER,
    would_repeat        INTEGER,
    lessons             TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS ceo_priorities (
    id                  TEXT PRIMARY KEY,
    task_id             TEXT,
    strategic_alignment REAL,
    impact              REAL,
    urgency             REAL,
    risk                REAL,
    resource_efficiency REAL,
    final_score         REAL,
    created_at          TEXT
);

-- ===================================================================
-- FOUNDER DIGITAL TWIN TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS founder_memory (
    id                  TEXT PRIMARY KEY,
    type                TEXT,
    data_json           TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS founder_decisions (
    id                      TEXT PRIMARY KEY,
    situation               TEXT,
    options_presented_json  TEXT,
    founder_choice          TEXT,
    reason                  TEXT,
    outcome                 TEXT,
    created_at              TEXT
);

CREATE TABLE IF NOT EXISTS founder_preferences (
    id                  TEXT PRIMARY KEY,
    category            TEXT,
    preference          TEXT,
    confidence          REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS founder_patterns (
    id                  TEXT PRIMARY KEY,
    pattern_type        TEXT,
    description         TEXT,
    evidence_count      INTEGER,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS founder_interviews (
    id                  TEXT PRIMARY KEY,
    question            TEXT,
    response            TEXT,
    category            TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS founder_similarity (
    id                  TEXT PRIMARY KEY,
    decision_id         TEXT,
    rec_sim             REAL,
    reason_sim          REAL,
    prio_sim            REAL,
    risk_sim            REAL,
    final_sim           REAL,
    created_at          TEXT
);

-- ===================================================================
-- EXECUTION GOVERNANCE TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS gov_budgets (
    id                  TEXT PRIMARY KEY,
    department          TEXT,
    api_usage           REAL,
    compute_usage       REAL,
    budget_limit        REAL,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS gov_permissions (
    id                  TEXT PRIMARY KEY,
    employee_id         TEXT UNIQUE,
    can_research        INTEGER DEFAULT 0,
    can_recommend       INTEGER DEFAULT 0,
    can_analyze         INTEGER DEFAULT 0,
    can_create_tasks    INTEGER DEFAULT 0,
    can_delegate        INTEGER DEFAULT 0,
    can_spend           INTEGER DEFAULT 0,
    can_modify          INTEGER DEFAULT 0,
    can_execute         INTEGER DEFAULT 0,
    updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS gov_kill_switch (
    id                  TEXT PRIMARY KEY,
    target_type         TEXT,
    target_id           TEXT,
    is_paused           INTEGER,
    reason              TEXT,
    updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS gov_audit_log (
    id                  TEXT PRIMARY KEY,
    action_type         TEXT,
    actor               TEXT,
    target              TEXT,
    trace_data          TEXT,
    created_at          TEXT
);

-- ===================================================================
-- WORKFORCE RUNTIME TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS rt_objectives (
    id                  TEXT PRIMARY KEY,
    title               TEXT,
    status              TEXT,
    progress            REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS rt_employee_states (
    id                  TEXT PRIMARY KEY,
    employee_id         TEXT UNIQUE,
    state               TEXT,
    current_task_id     TEXT,
    block_reason        TEXT,
    updated_at          TEXT
);

-- ===================================================================
-- INTELLIGENCE LAYER TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS intel_providers (
    id                  TEXT PRIMARY KEY,
    name                TEXT,
    model               TEXT,
    cost_per_1k         REAL,
    latency_ms          INTEGER,
    reliability_score   REAL,
    accuracy_score      REAL,
    status              TEXT,
    updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS intel_tools (
    id                  TEXT PRIMARY KEY,
    name                TEXT,
    category            TEXT,
    description         TEXT,
    endpoint            TEXT,
    status              TEXT
);

CREATE TABLE IF NOT EXISTS intel_employee_capabilities (
    id                  TEXT PRIMARY KEY,
    employee_id         TEXT,
    capability_name     TEXT,
    status              TEXT
);

CREATE TABLE IF NOT EXISTS intel_usage_costs (
    id                  TEXT PRIMARY KEY,
    target_type         TEXT,  -- 'EMPLOYEE', 'DEPARTMENT', 'OBJECTIVE', 'PROVIDER'
    target_id           TEXT,
    provider_id         TEXT,
    tokens_used         INTEGER,
    cost_incurred       REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS intel_audit_log (
    id                  TEXT PRIMARY KEY,
    task_id             TEXT,
    capability_id       TEXT,
    provider_id         TEXT,
    cost                REAL,
    latency_ms          INTEGER,
    was_successful      INTEGER,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS intel_cache (
    id                  TEXT PRIMARY KEY,
    query_hash          TEXT UNIQUE,
    response_payload    TEXT,
    created_at          TEXT,
    last_accessed       TEXT,
    hit_count           INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS intel_evaluations (
    id                  TEXT PRIMARY KEY,
    response_id         TEXT,
    quality_score       REAL,
    completeness_score  REAL,
    confidence_score    REAL,
    consistency_score   REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS intel_knowledge_queue (
    id                  TEXT PRIMARY KEY,
    payload             TEXT,
    source              TEXT,
    status              TEXT,
    created_at          TEXT
);

-- ===================================================================
-- MISSION ZERO TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS mz_autonomy_readiness (
    id                  TEXT PRIMARY KEY,
    current_score       REAL DEFAULT 0.0,
    updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_trust_ledger (
    id                  TEXT PRIMARY KEY,
    employee_id         TEXT,
    action_type         TEXT,
    result              TEXT,
    points              REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_executive_scorecards (
    id                  TEXT PRIMARY KEY,
    employee_id         TEXT,
    metric_name         TEXT,
    score               REAL DEFAULT 0.0,
    updated_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_mission_sandbox (
    id                  TEXT PRIMARY KEY,
    mission_name        TEXT,
    status              TEXT,
    score               REAL DEFAULT 0.0,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_inbox_items (
    id                  TEXT PRIMARY KEY,
    payload             TEXT,
    impact              REAL DEFAULT 0.0,
    urgency             REAL DEFAULT 0.0,
    risk                REAL DEFAULT 0.0,
    strategic_imp       REAL DEFAULT 0.0,
    total_score         REAL DEFAULT 0.0,
    is_visible          INTEGER DEFAULT 0,
    created_at          TEXT
);

-- ===================================================================
-- MISSION ALPHA (SANDBOX CALIBRATION) TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS mz_alpha_communications (
    id                  TEXT PRIMARY KEY,
    sender_id           TEXT,
    receiver_id         TEXT,
    message_type        TEXT,
    payload             TEXT,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_alpha_interventions (
    id                  TEXT PRIMARY KEY,
    action_type         TEXT,
    reason              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_alpha_health (
    id                  TEXT PRIMARY KEY,
    collaboration       REAL DEFAULT 0.0,
    trust               REAL DEFAULT 0.0,
    gov_compliance      REAL DEFAULT 0.0,
    execution_quality   REAL DEFAULT 0.0,
    communication       REAL DEFAULT 0.0,
    total_health        REAL DEFAULT 0.0,
    updated_at          TEXT
);

-- ===================================================================
-- MISSION BETA (CRISIS SIMULATION) TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS mz_beta_severity (
    id                  TEXT PRIMARY KEY,
    phase               TEXT,
    severity_score      INTEGER,
    status_label        TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_beta_evaluations (
    id                  TEXT PRIMARY KEY,
    question            TEXT,
    answer              TEXT
);

CREATE TABLE IF NOT EXISTS mz_beta_deliverables (
    id                  TEXT PRIMARY KEY,
    title               TEXT,
    content             TEXT,
    created_at          TEXT
);

-- ===================================================================
-- MISSION GAMMA (30-DAY COMPANY SIMULATION) TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS mz_gamma_state (
    day                 INTEGER PRIMARY KEY,
    cash                REAL,
    revenue             REAL,
    profit              REAL,
    orders              INTEGER,
    inventory_tshirt    INTEGER,
    inventory_hoodie    INTEGER,
    inventory_sweat     INTEGER,
    org_health          REAL,
    trust               REAL,
    csat                REAL,
    alloc_score         REAL,
    opp_cost            REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_gamma_learning (
    id                  TEXT PRIMARY KEY,
    event               TEXT,
    decision            TEXT,
    result              TEXT,
    lesson              TEXT,
    confidence          REAL,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS mz_gamma_deliverables (
    id                  TEXT PRIMARY KEY,
    title               TEXT,
    content             TEXT,
    created_at          TEXT
);

-- ===================================================================
-- MISSION DELTA (PRODUCTION REALITY INTEGRATION) TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS production_kb_documents (
    id                  TEXT PRIMARY KEY,
    title               TEXT,
    category            TEXT,
    content             TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS production_products (
    id                  TEXT PRIMARY KEY,
    name                TEXT,
    sku                 TEXT,
    category            TEXT,
    color               TEXT,
    pricing             REAL,
    inventory           INTEGER,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS production_live_metrics (
    id                  TEXT PRIMARY KEY,
    metric_name         TEXT,
    value               REAL,
    timestamp           TEXT
);

CREATE TABLE IF NOT EXISTS production_decision_queue (
    id                  TEXT PRIMARY KEY,
    agent               TEXT,
    action_type         TEXT,
    description         TEXT,
    confidence          REAL,
    impact              REAL,
    risk                REAL,
    status              TEXT, -- PENDING, APPROVED, REJECTED
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS production_org_memory (
    id                  TEXT PRIMARY KEY,
    event               TEXT,
    decision            TEXT,
    outcome             TEXT,
    lesson              TEXT,
    confidence          REAL,
    created_at          TEXT
);

-- ===================================================================
-- MISSION OMEGA (EXECUTION & ACCOUNTABILITY) TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS omega_objectives (
    id                  TEXT PRIMARY KEY,
    title               TEXT,
    target              TEXT,
    metric              TEXT,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS omega_projects (
    id                  TEXT PRIMARY KEY,
    objective_id        TEXT,
    title               TEXT,
    status              TEXT,
    created_at          TEXT
);

CREATE TABLE IF NOT EXISTS omega_tasks (
    id                  TEXT PRIMARY KEY,
    project_id          TEXT,
    title               TEXT,
    owner               TEXT,
    deadline            TEXT,
    revenue_impact      REAL,
    status              TEXT, -- PENDING, IN_PROGRESS, COMPLETED, BLOCKED, OVERDUE
    blocker             TEXT,
    completion_pct      INTEGER,
    created_at          TEXT
);

-- ===================================================================
-- REALITY LAYER V1 TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS daily_revenue (
    id TEXT PRIMARY KEY,
    date TEXT,
    channel TEXT,
    amount REAL,
    notes TEXT,
    data_source TEXT,
    created_by TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_orders (
    id TEXT PRIMARY KEY,
    date TEXT,
    channel TEXT,
    orders INTEGER,
    notes TEXT,
    data_source TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    sku TEXT,
    product_name TEXT,
    quantity INTEGER,
    data_source TEXT,
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS cash_position (
    id TEXT PRIMARY KEY,
    date TEXT,
    cash_available REAL,
    notes TEXT,
    data_source TEXT,
    updated_by TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT,
    category TEXT,
    amount REAL,
    description TEXT,
    data_source TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS reality_audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    user TEXT,
    action TEXT,
    entity TEXT,
    old_value TEXT,
    new_value TEXT,
    source TEXT
);

-- ===================================================================
-- SHARED SERVICES (CANONICAL) TABLES - PHASE 2
-- ===================================================================

CREATE TABLE IF NOT EXISTS system_tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT, -- PENDING, IN_PROGRESS, COMPLETED, BLOCKED
    owner TEXT,
    context TEXT,
    priority TEXT,
    completion_pct INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS system_approvals (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    context TEXT,
    requester TEXT,
    risk TEXT,
    cost REAL,
    status TEXT, -- PENDING, APPROVED, REJECTED
    resolved_by TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS system_objectives (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT, -- ACTIVE, COMPLETED, ARCHIVED
    target_date TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS system_communications (
    id TEXT PRIMARY KEY,
    type TEXT, -- ESCALATION, NOTIFICATION, DIRECT_MESSAGE
    title TEXT,
    description TEXT,
    sender TEXT,
    recipient TEXT,
    severity TEXT,
    status TEXT, -- OPEN, RESOLVED, READ
    created_at TEXT,
    updated_at TEXT
);

-- ===================================================================
-- EKVAAR OS CORE TABLES (from Goal and Vision Reference Document)
-- ===================================================================

-- Event Ledger: append-only log of every system event
CREATE TABLE IF NOT EXISTS event_ledger (
    id              TEXT PRIMARY KEY,
    event_type      TEXT NOT NULL,
    source_type     TEXT,
    source_id       TEXT,
    actor_id        TEXT,
    actor_type      TEXT,
    payload         TEXT,
    created_at      TEXT
);

-- Issues: the core work objects in EKVAAR OS
CREATE TABLE IF NOT EXISTS issues (
    id                  TEXT PRIMARY KEY,
    identifier          TEXT UNIQUE,
    title               TEXT NOT NULL,
    description         TEXT,
    status              TEXT DEFAULT 'backlog',
    priority            TEXT DEFAULT 'medium',
    assignee_id         TEXT,
    creator_id          TEXT,
    project_id          TEXT,
    parent_issue_id     TEXT,
    labels              TEXT,
    due_date            TEXT,
    estimate            REAL,
    hidden_at           TEXT,
    checkout_agent_id   TEXT,
    checkout_run_id     TEXT,
    workspace_id        TEXT,
    created_at          TEXT,
    updated_at          TEXT
);

-- Issue Comments: conversation thread on an issue
CREATE TABLE IF NOT EXISTS issue_comments (
    id              TEXT PRIMARY KEY,
    issue_id        TEXT NOT NULL,
    author_id       TEXT NOT NULL,
    author_type     TEXT DEFAULT 'human',
    body            TEXT NOT NULL,
    run_id          TEXT,
    created_at      TEXT,
    updated_at      TEXT
);

-- Issue Blocking Links: directed blocking relationships
CREATE TABLE IF NOT EXISTS issue_blocking_links (
    id                  TEXT PRIMARY KEY,
    blocked_issue_id    TEXT NOT NULL,
    blocking_issue_id   TEXT NOT NULL,
    created_at          TEXT
);

-- Issue Activity: chronological system log per issue
CREATE TABLE IF NOT EXISTS issue_activity (
    id              TEXT PRIMARY KEY,
    issue_id        TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    actor_id        TEXT,
    actor_type      TEXT,
    old_value       TEXT,
    new_value       TEXT,
    run_id          TEXT,
    created_at      TEXT
);

-- Heartbeat Runs: every agent execution is a discrete run
CREATE TABLE IF NOT EXISTS runs (
    id              TEXT PRIMARY KEY,
    agent_id        TEXT NOT NULL,
    issue_id        TEXT,
    routine_id      TEXT,
    trigger_type    TEXT,
    status          TEXT DEFAULT 'queued',
    input_tokens    INTEGER DEFAULT 0,
    output_tokens   INTEGER DEFAULT 0,
    cached_tokens   INTEGER DEFAULT 0,
    cost            REAL DEFAULT 0.0,
    model_used      TEXT,
    provider        TEXT,
    started_at      TEXT,
    completed_at    TEXT,
    error_message   TEXT,
    created_at      TEXT
);

-- OS Approvals: governance gates with full lifecycle
CREATE TABLE IF NOT EXISTS os_approvals (
    id                      TEXT PRIMARY KEY,
    type                    TEXT NOT NULL,
    status                  TEXT DEFAULT 'pending',
    requested_by_agent_id   TEXT,
    company_id              TEXT,
    payload                 TEXT,
    resolution_comment      TEXT,
    resolved_by             TEXT,
    linked_issue_ids        TEXT,
    created_at              TEXT,
    resolved_at             TEXT
);

-- Routines: scheduled agent work with cron triggers
CREATE TABLE IF NOT EXISTS routines (
    id                  TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    description         TEXT,
    agent_id            TEXT NOT NULL,
    cron_expression     TEXT,
    timezone            TEXT DEFAULT 'UTC',
    status              TEXT DEFAULT 'active',
    concurrency_policy  TEXT DEFAULT 'coalesce',
    catchup_policy      TEXT DEFAULT 'skip',
    last_run_at         TEXT,
    next_run_at         TEXT,
    run_count           INTEGER DEFAULT 0,
    created_at          TEXT,
    updated_at          TEXT
);

-- Routine Triggers: webhook and event triggers for routines
CREATE TABLE IF NOT EXISTS routine_triggers (
    id              TEXT PRIMARY KEY,
    routine_id      TEXT NOT NULL,
    trigger_type    TEXT NOT NULL,
    config          TEXT,
    public_id       TEXT UNIQUE,
    signing_mode    TEXT,
    enabled         INTEGER DEFAULT 1,
    created_at      TEXT
);

-- OS Budgets: spend ceilings per company/agent/project
CREATE TABLE IF NOT EXISTS os_budgets (
    id              TEXT PRIMARY KEY,
    scope           TEXT NOT NULL,
    scope_id        TEXT,
    monthly_limit   REAL,
    lifetime_limit  REAL,
    current_spend   REAL DEFAULT 0.0,
    status          TEXT DEFAULT 'normal',
    period          TEXT,
    created_at      TEXT,
    updated_at      TEXT
);

-- Budget Incidents: threshold breach records
CREATE TABLE IF NOT EXISTS budget_incidents (
    id              TEXT PRIMARY KEY,
    budget_id       TEXT NOT NULL,
    incident_type   TEXT NOT NULL,
    scope           TEXT,
    scope_id        TEXT,
    breach_amount   REAL,
    budget_limit    REAL,
    status          TEXT DEFAULT 'open',
    resolution      TEXT,
    created_at      TEXT,
    resolved_at     TEXT
);

-- Skills: reusable markdown procedures
CREATE TABLE IF NOT EXISTS skills (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    domain          TEXT,
    description     TEXT,
    file_path       TEXT NOT NULL,
    status          TEXT DEFAULT 'active',
    created_at      TEXT,
    updated_at      TEXT
);

-- Agent-Skill assignments
CREATE TABLE IF NOT EXISTS agent_skills (
    agent_id        TEXT NOT NULL,
    skill_id        TEXT NOT NULL,
    PRIMARY KEY (agent_id, skill_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id                TEXT PRIMARY KEY,
    conversation_id   TEXT,
    target_id         TEXT,
    sender            TEXT,
    content           TEXT,
    timestamp         TEXT,
    created_date      TEXT,
    status            TEXT DEFAULT 'sent',
    message_type      TEXT DEFAULT 'text',
    metadata          TEXT,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id                TEXT PRIMARY KEY,
    title             TEXT,
    purpose           TEXT,
    channel           TEXT,
    participant_name  TEXT,
    unread            INTEGER DEFAULT 0,
    last_message_at   TEXT,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS digital_employees (
    id                TEXT PRIMARY KEY,
    name              TEXT,
    role              TEXT,
    department        TEXT,
    status            TEXT DEFAULT 'offline',
    capabilities      TEXT,
    current_task      TEXT,
    performance_metrics TEXT,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_protocols (
    id                TEXT PRIMARY KEY,
    title             TEXT,
    description       TEXT,
    category          TEXT,
    severity          TEXT DEFAULT 'normal',
    approval_required BOOLEAN DEFAULT 0,
    version           INTEGER DEFAULT 1,
    content           TEXT,
    created_by        TEXT,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id                TEXT PRIMARY KEY,
    type              TEXT,
    title             TEXT,
    message           TEXT,
    priority          TEXT DEFAULT 'normal',
    app_id            TEXT,
    data              TEXT,
    read              BOOLEAN DEFAULT 0,
    created_at        TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================
-- PHASE 3: TELEMETRY & RISK ENGINE TABLES
-- ===================================================================

-- Telemetry Metrics: Current state of metrics
CREATE TABLE IF NOT EXISTS telemetry_metrics (
    id                TEXT PRIMARY KEY,
    metric_name       TEXT NOT NULL,
    metric_type       TEXT,
    value             REAL,
    source            TEXT,
    tags              TEXT,
    metadata          TEXT,
    ingested_at       TEXT
);

-- Telemetry Metric History: Time-series data
CREATE TABLE IF NOT EXISTS telemetry_metric_history (
    id                TEXT PRIMARY KEY,
    metric_name       TEXT NOT NULL,
    metric_type       TEXT,
    value             REAL,
    source            TEXT,
    tags              TEXT,
    metadata          TEXT,
    ingested_at       TEXT
);

-- Telemetry Signals: Detected anomalies and threshold breaches
CREATE TABLE IF NOT EXISTS telemetry_signals (
    id                TEXT PRIMARY KEY,
    signal_type       TEXT,
    metric_name       TEXT,
    current_value     REAL,
    baseline_value    REAL,
    deviation         REAL,
    severity          TEXT,
    message           TEXT,
    detected_at       TEXT,
    status            TEXT DEFAULT 'NEW',
    acknowledged_at   TEXT
);

-- Telemetry Risks: Risk assessments
CREATE TABLE IF NOT EXISTS telemetry_risks (
    id                TEXT PRIMARY KEY,
    risk_level        TEXT,
    category          TEXT,
    metric            TEXT,
    score             REAL,
    message           TEXT,
    current_value     REAL,
    signal_id         TEXT,
    detected_at       TEXT,
    status            TEXT DEFAULT 'ACTIVE',
    resolved_at       TEXT,
    resolved_by       TEXT,
    resolution        TEXT
);

-- ===================================================================
-- PHASE 4: WORKFLOW & AUTOMATION TABLES
-- ===================================================================

-- Workflow Executions: Audit trail of automated workflows
CREATE TABLE IF NOT EXISTS workflow_executions (
    id                TEXT PRIMARY KEY,
    rule_name         TEXT,
    trigger_type      TEXT,
    task_id           TEXT,
    action_type       TEXT,
    status            TEXT DEFAULT 'PENDING',
    created_at        TEXT,
    completed_at      TEXT,
    error_message     TEXT
);

-- Workflow Rules: Configuration of automation rules
CREATE TABLE IF NOT EXISTS workflow_rules (
    id                TEXT PRIMARY KEY,
    name              TEXT,
    trigger           TEXT,
    conditions        TEXT,
    actions           TEXT,
    enabled           BOOLEAN DEFAULT 1,
    created_at        TEXT,
    updated_at        TEXT
);
"""


async def init_db() -> None:
    """Create every table (if it doesn't already exist) and return."""
    db = await _connect()
    try:
        await db.executescript(_SCHEMA_SQL)
        await db.commit()
    finally:
        await db.close()
