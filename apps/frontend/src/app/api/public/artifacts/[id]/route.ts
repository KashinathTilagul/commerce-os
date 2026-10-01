import { NextRequest, NextResponse } from 'next/server'
import { readStoredArtifact } from '@/lib/storage'
import { db } from '@/lib/db'
import { verifyArtifactSignature } from '@/lib/artifact-public'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!verifyArtifactSignature(id, req.nextUrl.searchParams.get('signature') || '')) return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  const artifact = await db.artifact.findUnique({ where: { id }, select: { storageLocation: true, mimeType: true, contentHash: true } })
  if (!artifact?.storageLocation) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  const file = await readStoredArtifact(artifact.storageLocation)
  return new NextResponse(new Uint8Array(file), { headers: { 'Content-Type': artifact.mimeType, 'Content-Length': String(file.length), 'Cache-Control': 'public, max-age=86400, immutable', ETag: `"${artifact.contentHash || id}"` } })
}
