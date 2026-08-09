import { db } from './db'
import { executeTool } from './composio-service'

const PROVIDERS = [
  { toolkit: 'shopify', label: 'Shopify', readTool: 'shopify_get_products', input: { limit: 1 } },
  { toolkit: 'meta_ads', label: 'Meta Ads' },
  { toolkit: 'instagram', label: 'Instagram' },
] as const

export async function getCampaignProviderReadiness(organizationId: string) {
  const integrations = await db.integration.findMany({
    where: { organizationId, toolkitSlug: { in: PROVIDERS.map((provider) => provider.toolkit) } },
  })
  const byToolkit = new Map(integrations.map((integration) => [integration.toolkitSlug, integration]))
  const shopifyIntegration = byToolkit.get('shopify')
  const latestShopifyCheck = shopifyIntegration ? await db.toolExecution.findFirst({
    where: { integrationId: shopifyIntegration.id, toolSlug: 'shopify_get_products' },
    orderBy: { createdAt: 'desc' },
    select: { status: true, createdAt: true, errorMessage: true },
  }) : null
  return PROVIDERS.map((provider) => {
    const integration = byToolkit.get(provider.toolkit)
    const check = provider.toolkit === 'shopify' ? latestShopifyCheck : null
    return {
      toolkit: provider.toolkit,
      label: provider.label,
      connected: Boolean(integration?.isConnected && integration.connectedAccountId),
      verified: check?.status === 'SUCCESS',
      checkedAt: check?.createdAt ?? null,
      reason: !integration?.isConnected
        ? `Connect ${provider.label} in Integrations`
        : check?.status === 'ERROR'
          ? check.errorMessage
          : provider.toolkit === 'shopify' && !check
            ? 'Run a read-only connection check'
            : null,
    }
  })
}

export async function checkShopifyReadiness(organizationId: string) {
  const readiness = await getCampaignProviderReadiness(organizationId)
  const shopify = readiness.find((provider) => provider.toolkit === 'shopify')!
  if (!shopify.connected) return { ...shopify, verified: false }
  const integration = await db.integration.findFirstOrThrow({ where: { organizationId, toolkitSlug: 'shopify' } })
  const execution = await db.toolExecution.create({
    data: {
      integrationId: integration.id,
      agentCode: 'CEO',
      agentName: 'Krishna',
      toolName: 'shopify_get_products',
      toolSlug: 'shopify_get_products',
      input: JSON.stringify({ limit: 1 }),
    },
  })
  const result = await executeTool({
    organizationId,
    toolkitSlug: 'shopify',
    toolSlug: 'shopify_get_products',
    agentCode: 'CEO',
    agentName: 'Krishna',
    input: { limit: 1 },
  })
  await db.$transaction([
    db.toolExecution.update({
      where: { id: execution.id },
      data: {
        status: result.success ? 'SUCCESS' : 'ERROR',
        output: result.success ? JSON.stringify({ verified: true }) : null,
        errorMessage: result.error ?? null,
        duration: result.duration,
      },
    }),
    db.integration.update({ where: { id: integration.id }, data: { executionsCount: { increment: 1 } } }),
    db.event.create({
      data: {
        organizationId,
        type: 'TOOL_EXECUTION',
        actorName: 'Krishna',
        summary: `Krishna verified Shopify connectivity -> ${result.success ? 'SUCCESS' : 'ERROR'}`,
        payload: JSON.stringify({ executionId: execution.id, tool: 'shopify_get_products', success: result.success, duration: result.duration }),
        severity: result.success ? 'INFO' : 'WARN',
      },
    }),
  ])
  return { ...shopify, verified: result.success, checkedAt: new Date(), reason: result.error ?? null, duration: result.duration }
}
