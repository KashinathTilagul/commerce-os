export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response
  
  const { id: artifactId } = await params
  
  try {
    // Get artifact from database
    const artifact = await db.artifact.findFirst({
      where: { 
        id: artifactId,
        organizationId: authResult.organizationId 
      }
    })
    
    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      )
    }
    
    if (!artifact.storageLocation) {
      return NextResponse.json(
        { error: 'Artifact has no storage location' },
        { status: 404 }
      )
    }
    
    // Read file from storage
    const fileBuffer = await fs.readFile(artifact.storageLocation)
    
    // Header values must stay ASCII — titles carry "·"/"—" from LLM output,
    // so the unicode name goes in filename* (RFC 5987) and an ASCII-safe one
    // in filename.
    const filename = `${artifact.title}.${getFileExtension(artifact.mimeType, artifact.type)}`
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '').trim() || `${artifact.id}.${getFileExtension(artifact.mimeType, artifact.type)}`
    
    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': artifact.mimeType,
        // Generated assets are consumed inside the workboard. Inline keeps media
        // previewable while the direct URL remains available for download/share.
        'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': fileBuffer.length.toString()
      }
    })
  } catch (error: any) {
    console.error('[Artifact Download API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve artifact' },
      { status: 500 }
    )
  }
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'text/html': 'html',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

function getFileExtension(mimeType: string, type: string): string {
  return MIME_TO_EXT[mimeType] || { PDF: 'pdf', PNG: 'png', VIDEO: 'mp4', AUDIO: 'mp3', EXCEL: 'xlsx' }[type] || 'bin'
}
