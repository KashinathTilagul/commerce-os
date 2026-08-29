import { NextResponse } from 'next/server'

import { requireOrganization } from '@/lib/auth-guard'

/** Internal Nginx auth_request target for the embedded Workforce runtime. */
export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  return new NextResponse(null, { status: 204 })
}
