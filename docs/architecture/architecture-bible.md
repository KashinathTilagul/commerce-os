# EKVAAR Operating System: Architecture Bible

## Core Philosophy
EKVAAR is not a dashboard. It is a Fashion Operating System. Its purpose is not just to display metrics, but to operate the fashion brand autonomously through an AI workforce. Everything built into the platform must serve this goal.

## 1. The Multi-Tenant Architecture (Organization-First)
The platform is strictly multi-tenant. The core unit of isolation is the `Organization`, NOT the `User`.
- Users belong to Organizations. They do not own data directly.
- **Rule of Thumb**: If it is a business object (Product, Order, Customer, Agent), it belongs to an `organizationId`.
- The only exception is `UserPreference`, which is scoped to `userId` to allow individuals to customize their interface (e.g. Dark Mode, notification preferences) without affecting their coworkers.

## 2. The Commerce Abstraction Layer
The platform never stores provider-specific data directly in canonical tables.
- A `Product` is our canonical representation of a fashion item. It is provider-agnostic.
- The connection to external systems (e.g., Shopify, Amazon, WooCommerce) is handled via Provider integrations.
- **Rule of Thumb**: Applications never talk to Shopify directly. They talk to the `Commerce Hub`, which normalizes data into canonical shapes.

## 3. The Knowledge Engine
Data is useless to an AI without relationships.
- Every canonical business object is mirrored as a `KnowledgeNode` in the Graph.
- Relationships between objects (e.g., "Customer X bought Product Y") are stored as `KnowledgeEdge`.
- The AI Runtime does not query SQL for business logic. It queries the Knowledge Graph. This ensures the AI always has context.

## 4. AI Runtime Boundaries
The AI executes in a strictly bounded runtime.
- **No Direct Database Access**: Agents never query Prisma. They must ask the `ContextBuilder` for information.
- **Provider Agnosticism**: Agents do not hardcode LLM providers (e.g., OpenAI). They request completion through the generic OS Model Provider interface.
- **Stateless Execution**: The AI execution loop is stateless. State is managed by the `MemoryEngine` and `WorkspaceManager`.

## 5. Security & Isolation
- Every API Route and Server Action must pass through the `requireOrganization()` guard.
- Never implicitly fall back to a personal namespace. If there is no active organization, access is denied.

## 6. Design System 3.0 Principles (Liquid & Executive Glass)
- **Principle 8 (Motion Communicates State):** Window opening spring scaling (`0.96 -> 1.00`), focus depth transitions, and menu bar ripples communicate system state without clutter.
- **Principle 9 (Depth Communicates Importance):** Active focused windows gain luminance, champagne edge highlights, and agni red elevation.
- **Principle 10 (Glass is Functional, Never Decorative):** `Liquid Glass` and `Executive Glass` provide contextual backdrop refraction without sacrificing text legibility.
- **Principle 11 (Calm OS):** Nothing flashes unnecessarily; Krishna operates as a serene Chief of Staff surfacing high-value briefs.
