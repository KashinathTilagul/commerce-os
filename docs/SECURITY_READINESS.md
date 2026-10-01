# Security readiness — 2026-10-01

This hardening batch closes the reported fail-open cron and WooCommerce webhook authentication, raw Instagram publish bypass, organization-wide account-deletion damage, unrestricted OmniRoute URL changes, unauthenticated Spotify token access, shell-based video execution, artifact path traversal, browser profile injection, browser worker authentication, and duplicate scheduler/queue claims. Setup now creates an organization inside a serializable transaction. Administrator-only configuration and store-update checks are enforced on the server.

The frontend uses npm and package-lock.json as its single dependency source. Production Docker builds use npm ci. The stale SQLite backup and placeholder tests were removed; personal marketing files are not part of this release.

Run `npm ci --legacy-peer-deps`, `npm run db:generate`, `npm run test:all`, `npm run build`, and `npm audit --omit=dev` in apps/frontend. Guard tests require Bun. A passing build is not evidence that live credentials, payments, social publishing, or infrastructure work.

## Release limitations

Browser automation is disabled by default. Enabling it requires an isolated worker network that cannot reach metadata, internal services, or host resources, plus BROWSE_WORKER_KEY. Do not enable it on the shared service network.

The Workforce Docker supervisor retains Docker-socket privileges. Its host must be isolated from sensitive infrastructure; this release does not make its privileged execution safe for arbitrary public tenants. Per-process API rate limiting is not a distributed abuse-control system. Redis scheduler leases are not fencing tokens and require durable job claims for long-running or paused processes.

WooCommerce environment credentials are explicitly scoped to one WOOCOMMERCE_ORGANIZATION_ID. This is not a self-service multi-store credential implementation. Use read-only store keys and confirm live sync before relying on inventory or briefs.

Upstream Workforce remains pinned: bulk-merging its divergent upstream changes is not included without compatibility testing. WhatsApp customer messaging is still catalog-only. Public launch is not approved merely by merging this batch; tenant isolation, payment flows, privileged computers, and authenticated production flows need live validation.

The production deployment runner was offline during verification. Deployment cannot complete until the operator restores that runner and adequate disk capacity. No database volumes should be deleted to free space.
