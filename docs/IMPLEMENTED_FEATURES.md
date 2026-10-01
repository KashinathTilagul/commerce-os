# Ekvaar OS implementation status

The application uses Next.js App Router and React. Frontend API routes use Prisma with PostgreSQL. FastAPI is a separate service in Docker Compose, not a replacement for the Next.js backend. Workforce is supplied by the `vendor/rakazo` Git submodule and runs as separate API, worker and web services.

## Commerce

The WooCommerce REST provider reads products, orders, customers and inventory. Configure a read-only WooCommerce key, URL and `WOOCOMMERCE_ORGANIZATION_ID`. The environment-configured store belongs only to that organization; other organizations are denied. Full sync follows pagination. Webhooks require a signing secret and use organization-scoped order lookup. Source implementation is not proof of a successful production sync.

## Publishing

Raw Instagram publishing is disabled. Marketing tasks must be READY before the Founder can approve them. Scheduling requires prior approval; the shared task publisher reloads the approved draft before sending it. Scheduled campaign revisions have a separate approval-filtered path. These controls do not certify arbitrary external integrations or the separately deployed Workforce runtime.

## Scheduling

Agent sweeps and scheduled marketing tasks use shared Redis leases. Redis is required; lock failure prevents work. A process paused longer than the lease remains a known limitation; durable job claims and fencing are needed for that failure model. Live multi-instance testing is still required.

## WhatsApp

WhatsApp appears in the Composio catalog. A complete customer workflow with consent, templates, delivery handling and approval checks is not implemented or verified here.

See README.md and docker-compose.yml for deployment architecture. No feature should be described as production-ready solely because its source or catalog entry exists.
