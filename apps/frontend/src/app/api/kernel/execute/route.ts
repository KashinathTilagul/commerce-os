import { NextResponse } from 'next/server'
import { Kernel } from '@/lib/os/kernel'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(req: Request) {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response
    const organizationId = auth.user.id
    
    const body = await req.json()
    const { intent, payload } = body

    if (!intent) {
      return NextResponse.json({ error: 'Intent is required' }, { status: 400 })
    }

    // Pass the request to the OS Kernel
    const result = await Kernel.execute({
      organizationId: organizationId,
      intent,
      payload: payload || {}
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API/Kernel] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
