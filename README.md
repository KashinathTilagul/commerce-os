# EKVAAR OS 

**The Agentic Operating System for Founders**

EKVAAR OS is a unified, autonomous intelligence layer designed to serve as the central nervous system for a business. It abstracts mechanical operations, orchestrates autonomous agents, and strictly enforces governance across all external systems.

## Core Architecture

EKVAAR OS represents a complete paradigm shift from legacy "dashboards" and "SaaS tools". It is an **Operating System** that runs business operations natively.

### Technology Stack
- **Frontend Layer**: React, Vite, Tailwind CSS (Custom Tahoe Design System)
- **Intelligence Layer**: FastAPI, Python, LangChain, SQLite (Transitioning to PostgreSQL)
- **Integration Engine**: n8n (Embedded securely for workflow and credential management)
- **Automation Layer**: Background task orchestration via Celery/Redis (Pending deployment)

## The Principles of EKVAAR OS

1. **Central Nervous System**: EKVAAR OS owns the business logic, knowledge, and execution DAGs. External tools (e.g., Shopify, Stripe) are treated strictly as dumb data pipes and mechanical systems of record.
2. **Zero Duplicate Logic**: Logic resides exclusively within EKVAAR OS.
3. **Immutable Governance**: Agent autonomy is strictly throttled by the Founder's explicit constraints (Budget, Risk, Policy).
4. **Agent Registry**: Specialized agents (Marketing, Research, Operations) are spawned, governed, and killed by the OS depending on the organizational need.

## Setup & Deployment

### Local Development (Current State)

EKVAAR OS runs locally using a modular architecture:

1. **Backend API (Uvicorn / FastAPI)**
   ```bash
   cd apps/backend-py
   python -m uvicorn main:app --port 8000 --reload
   ```
2. **Frontend UI (Vite / React)**
   ```bash
   cd apps/frontend
   npm run dev
   ```
3. **Integration Engine (n8n)**
   ```bash
   npx -y n8n@latest
   ```

*(Ensure `.env` contains valid keys before starting.)*

### Production Deployment (Coolify)

EKVAAR OS is designed to be deployed natively on **Coolify** using Docker Compose. The production environment utilizes PostgreSQL, Redis, and a dedicated Scheduler for full autonomous reliability. Please refer to the upcoming deployment plans for the complete `docker-compose.yml` specs.

## Documentation

Comprehensive architecture blueprints can be found in the `/docs` directory:
- [Architecture Overview](docs/ARCHITECTURE_V2.md)
- [Agent Governance](docs/GOVERNANCE.md)
- [Integration Engine](docs/INTEGRATIONS.md)
- [Automation Engine](docs/AUTOMATION_V2.md)

---
*Built for the founder who demands leverage.*
