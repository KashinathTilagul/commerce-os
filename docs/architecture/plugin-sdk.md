# EKVAAR Plugin SDK

## Introduction
EKVAAR is designed to eventually be extensible via plugins. In Phase 3, this will be opened up to external developers.

## The Provider Contract
A Provider is a class that implements `IProvider`.

```typescript
export interface IProvider {
  name: string
  providerName: string
  authenticate(organizationId: string): Promise<boolean>
  health(): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'DOWN'; latencyMs?: number }>
  execute(toolSlug: string, params: { organizationId: string; input: any; agentCode?: string; agentName?: string }): Promise<ProviderResponse>
}
```

## Creating a Plugin
To create a plugin:
1. Define a class implementing `IProvider`.
2. Register it with the `ProviderRegistry` at startup (`kernel.ts` / `provider-manager.ts`).
3. Define its tools in the `CapabilityRegistry` so agents can dynamically discover and invoke them.

## Security Constraints
- Plugins never execute with raw database access. They operate strictly through the `ContextBuilder` and OS execution boundaries.
- Plugins receive an `organizationId` with every invocation and must strictly scope their external API calls to that tenant's credentials.
