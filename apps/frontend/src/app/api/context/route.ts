export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { storeContext, retrieveContext, searchContext } from '@/lib/context-store'

export async function GET(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const handle = searchParams.get('handle')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  if (handle) {
    const data = await retrieveContext(auth.organizationId, handle)
    if (!data) return NextResponse.json({ error: 'Not found or expired' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (search) {
    const data = await searchContext(auth.organizationId, search, limit)
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide handle or search query' }, { status: 400 })
}

export async function POST(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { source, summary, fullData, metadata, ttl } = body

    if (!source || !summary || !fullData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await storeContext(auth.organizationId, {
      source,
      summary,
      fullData,
      metadata,
      ttl
    })

    return NextResponse.json({ handle })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
