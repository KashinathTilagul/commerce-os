# Decision Log (ADRs)

## 1. Migration from userId to organizationId
- **Context**: The original SaaS starter used `userId` for data ownership. This broke when multiple users needed access to the same business data (Agents, Knowledge, Commerce).
- **Decision**: We migrated the entire platform to an `organizationId` centric model. `User` belongs to `Organization`. Data belongs to `Organization`.
- **Consequences**: Complex migration required dropping `@ts-nocheck` overrides. We now have strict multi-tenant isolation.

## 2. Capability over Application Permissions
- **Context**: SaaS applications often hardcode access control logic based on billing tiers (e.g., `if (tier === 'PRO') renderApp()`).
- **Decision**: We implemented a `CapabilityRegistry`. The business owns `Capabilities` (provided by Agents). The presence of a `Capability` determines whether an Application is accessible.
- **Consequences**: Applications are decoupled from billing. Adding a new AI Agent automatically unlocks the applications that require its capabilities.

## 3. The AIRuntime Boundary
- **Context**: Early AI features queried Prisma directly for context.
- **Decision**: Implemented `AIRuntime` and `ContextBuilder`. Agents no longer query SQL. They query the Knowledge Graph.
- **Consequences**: Agents are provider-agnostic. We can swap underlying databases or LLM providers without rewriting agent logic.

## 4. The Commerce Hub Abstraction
- **Context**: Initial plans suggested integrating Shopify directly into the database schema.
- **Decision**: We implemented a `Commerce Hub` that normalizes external data into canonical `Product`, `Order`, and `Customer` shapes.
- **Consequences**: EKVAAR can integrate with Amazon, WooCommerce, or custom ERPs in the future without changing the core OS or Agent logic.
