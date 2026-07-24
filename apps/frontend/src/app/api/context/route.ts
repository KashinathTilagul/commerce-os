import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { storeContext, retrieveContext, searchContext } from '@/lib/context-store'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const handle = searchParams.get('handle')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  if (handle) {
    const data = await retrieveContext(auth.user.id, handle)
    if (!data) return NextResponse.json({ error: 'Not found or expired' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (search) {
    const data = await searchContext(auth.user.id, search, limit)
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide handle or search query' }, { status: 400 })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { source, summary, fullData, metadata, ttl } = body

    if (!source || !summary || !fullData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = await storeContext(auth.user.id, {
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
