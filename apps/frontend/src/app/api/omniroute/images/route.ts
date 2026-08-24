export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { generateImage } from '@/lib/image-generator'
import {
  fetchOmniRouteImageModels,
  getOmniRouteConfig,
  saveOmniRouteConfig,
} from '@/lib/omniroute-config'

const TestImageModelSchema = z.object({
  modelId: z.string().min(1).max(300),
})

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const config = await getOmniRouteConfig(auth.organizationId)
    if (!config.hasApiKey) {
      return NextResponse.json({ models: [], selectedModel: '', error: 'Connect OmniRoute first' }, { status: 409 })
    }
    const models = await fetchOmniRouteImageModels(config.baseUrl, config.apiKey)
    return NextResponse.json({ models, selectedModel: config.imageModel })
  } catch (error: any) {
    return NextResponse.json({ models: [], selectedModel: '', error: error?.message || 'Could not load image models' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { modelId } = TestImageModelSchema.parse(await req.json())
    const config = await getOmniRouteConfig(auth.organizationId)
    const models = await fetchOmniRouteImageModels(config.baseUrl, config.apiKey)
    if (!models.some((model) => model.id === modelId)) {
      return NextResponse.json({ error: 'Select an image model returned by OmniRoute' }, { status: 400 })
    }

    const image = await generateImage({
      prompt: 'Minimal premium Indian editorial still life, folded black cotton garment, soft directional light, clean white background, no text',
      aspectRatio: '1:1',
      style: 'product',
      organizationId: auth.organizationId,
      generatedBy: 'SYSTEM_TEST',
      title: `Image model test — ${modelId}`,
      modelId,
    })
    await saveOmniRouteConfig(auth.organizationId, { imageModel: modelId })
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'IMAGE_MODEL_CONNECTED',
        actorName: 'Founder',
        summary: `Verified and selected image model ${modelId}`,
        payload: JSON.stringify({ modelId, artifactId: image.artifactId }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ success: true, modelId, artifactId: image.artifactId, imageUrl: image.imageUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Image model test failed' }, { status: 502 })
  }
}
