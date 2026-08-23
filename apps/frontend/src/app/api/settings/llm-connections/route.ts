export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/crypto'
import { isLlmProvider, LLM_PROVIDERS, testLlmConnection } from '@/lib/llm-connections'

function safeConnection(connection: any) {
  return {
    id: connection.id,
    provider: connection.provider,
    label: LLM_PROVIDERS[connection.provider as keyof typeof LLM_PROVIDERS]?.label || connection.provider,
    status: connection.status,
    models: JSON.parse(connection.models || '[]'),
    errorMessage: connection.errorMessage,
    lastTestedAt: connection.lastTestedAt,
  }
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
  if (settings) {
    const aliases: Record<string, string> = { google: 'gemini' }
    const legacy = [
      { provider: settings.primaryProvider, apiKey: settings.primaryApiKey, baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, apiKey: settings.fallback1ApiKey, baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, apiKey: settings.fallback2ApiKey, baseUrl: settings.fallback2BaseUrl },
    ].map((item) => ({ ...item, provider: aliases[item.provider] || item.provider }))
      .filter((item) => item.apiKey && isLlmProvider(item.provider))
    if (legacy.length) {
      await db.llmConnection.createMany({
        data: legacy.map((item) => ({
          organizationId: auth.organizationId,
          provider: item.provider,
          apiKey: item.apiKey,
          baseUrl: item.provider === 'bedrock' && item.baseUrl ? item.baseUrl : LLM_PROVIDERS[item.provider as keyof typeof LLM_PROVIDERS].baseUrl,
        })),
        skipDuplicates: true,
      })
    }
  }
  const connections = await db.llmConnection.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { provider: 'asc' },
  })
  return NextResponse.json({ connections: connections.map(safeConnection) })
}

export async function POST(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  try {
    const body = await request.json()
    const provider = String(body.provider || '')
    if (!isLlmProvider(provider)) return NextResponse.json({ error: 'Choose a supported provider' }, { status: 400 })

    const existing = await db.llmConnection.findUnique({
      where: { organizationId_provider: { organizationId: auth.organizationId, provider } },
    })
    const apiKey = String(body.apiKey || '').trim() || decryptSecret(existing?.apiKey)
    if (!apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 })

    try {
      const tested = await testLlmConnection(provider, apiKey)
      const connection = await db.llmConnection.upsert({
        where: { organizationId_provider: { organizationId: auth.organizationId, provider } },
        update: { apiKey: encryptSecret(apiKey), baseUrl: tested.baseUrl, status: 'LIVE', models: JSON.stringify(tested.models), errorMessage: null, lastTestedAt: new Date() },
        create: { organizationId: auth.organizationId, provider, apiKey: encryptSecret(apiKey), baseUrl: tested.baseUrl, status: 'LIVE', models: JSON.stringify(tested.models), lastTestedAt: new Date() },
      })
      return NextResponse.json({ connection: safeConnection(connection) })
    } catch (error: any) {
      if (existing) {
        await db.llmConnection.update({ where: { id: existing.id }, data: { status: 'ERROR', errorMessage: error.message, lastTestedAt: new Date() } })
      }
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Connection id is required' }, { status: 400 })
  const connection = await db.llmConnection.findFirst({ where: { id, organizationId: auth.organizationId } })
  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  const settings = await db.systemSetting.findUnique({ where: { organizationId: auth.organizationId } })
  const updates: Record<string, string> = {}
  if (settings?.primaryProvider === connection.provider) Object.assign(updates, { primaryProvider: '', primaryModel: '', primaryApiKey: '' })
  if (settings?.fallback1Provider === connection.provider) Object.assign(updates, { fallback1Provider: '', fallback1Model: '', fallback1ApiKey: '' })
  if (settings?.fallback2Provider === connection.provider) Object.assign(updates, { fallback2Provider: '', fallback2Model: '', fallback2ApiKey: '' })
  await db.$transaction([
    db.llmConnection.delete({ where: { id: connection.id } }),
    ...(Object.keys(updates).length ? [db.systemSetting.update({ where: { organizationId: auth.organizationId }, data: updates })] : []),
  ])
  return NextResponse.json({ success: true })
}
