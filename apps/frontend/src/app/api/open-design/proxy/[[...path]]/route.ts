export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'

async function proxy(request: NextRequest, parts: string[]) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const base = process.env.OPEN_DESIGN_URL?.replace(/\/$/, '')
  const token = process.env.OPEN_DESIGN_API_TOKEN
  if (!base || !token) return NextResponse.json({ error: 'Open Design is not configured' }, { status: 503 })
  const target = new URL(`${base}/${parts.map(encodeURIComponent).join('/')}`)
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value))
  const headers = new Headers({ authorization: `Bearer ${token}` })
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'follow', cache: 'no-store',
  })
  const outgoing = new Headers({ 'cache-control': 'no-store' })
  const responseType = response.headers.get('content-type')
  if (responseType) outgoing.set('content-type', responseType)
  if (responseType && /text\/html|javascript|text\/css/.test(responseType)) {
    const prefix = '/api/open-design/proxy'
    const rewritten = (await response.text())
      .replaceAll('"/_next/', `"${prefix}/_next/`)
      .replaceAll("'/_next/", `'${prefix}/_next/`)
      .replaceAll('url(/_next/', `url(${prefix}/_next/`)
      .replaceAll('href="/"', `href="${prefix}/"`)
      .replaceAll('href="/app-icon.png"', `href="${prefix}/app-icon.png"`)
    return new NextResponse(rewritten, { status: response.status, headers: outgoing })
  }
  return new NextResponse(response.body, { status: response.status, headers: outgoing })
}

type Context = { params: Promise<{ path?: string[] }> }
export async function GET(request: NextRequest, context: Context) { return proxy(request, (await context.params).path || []) }
export async function POST(request: NextRequest, context: Context) { return proxy(request, (await context.params).path || []) }
export async function PUT(request: NextRequest, context: Context) { return proxy(request, (await context.params).path || []) }
export async function PATCH(request: NextRequest, context: Context) { return proxy(request, (await context.params).path || []) }
export async function DELETE(request: NextRequest, context: Context) { return proxy(request, (await context.params).path || []) }
