import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireRole(['ADMIN'])
  if (!auth.success) return auth.response
  
  try {
    const count = await db.user.count()
    return NextResponse.json({ userCount: count, canReset: count === 0 })
  } catch (error) {
    console.error('Reset Check Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN'])
  if (!auth.success) return auth.response
  
  try {
    const { confirm } = await req.json()
    
    if (confirm !== 'WIPE_ALL_USERS') {
      return NextResponse.json({ error: 'Confirmation required. Send { "confirm": "WIPE_ALL_USERS" }' }, { status: 400 })
    }
    
    console.log('[RESET] Wiping all user accounts...')
    
    const sessionCount = await db.session.deleteMany()
    const accountCount = await db.account.deleteMany()
    const auditCount = await db.auditLog.deleteMany()
    const prefCount = await db.userPreference.deleteMany()
    const userCount = await db.user.deleteMany()
    const tokenCount = await db.verificationToken.deleteMany()
    
    try {
      await db.systemSetting.deleteMany()
    } catch {}
    
    console.log('[RESET] All user accounts wiped successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'All user accounts deleted. Visit /signup to create a new account.',
      deleted: {
        sessions: sessionCount.count,
        accounts: accountCount.count,
        users: userCount.count
      }
    })
  } catch (error: any) {
    console.error('[RESET] Error:', error)
    return NextResponse.json({ error: 'Failed to reset users', details: error.message }, { status: 500 })
  }
}
