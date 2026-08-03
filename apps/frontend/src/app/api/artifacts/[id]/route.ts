import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response
  
  const artifactId = params.id
  
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
    
    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': artifact.mimeType,
        'Content-Disposition': `attachment; filename="${artifact.title}.${getFileExtension(artifact.type)}"`,
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

function getFileExtension(type: string): string {
  switch (type) {
    case 'PDF': return 'pdf'
    case 'PNG': return 'png'
    case 'VIDEO': return 'mp4'
    case 'EXCEL': return 'xlsx'
    default: return 'bin'
  }
}
