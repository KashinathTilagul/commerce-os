import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const count = await db.user.count()
    return NextResponse.json({ userCount: count, canReset: count === 0 })
  } catch (error) {
    console.error('Reset Check Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { confirm } = await req.json()
    
    if (confirm !== 'WIPE_ALL_USERS') {
      return NextResponse.json({ error: 'Confirmation required. Send { "confirm": "WIPE_ALL_USERS" }' }, { status: 400 })
    }
    
    console.log('[RESET] Wiping all user accounts...')
    
    const sessionCount = await db.session.deleteMany()
    console.log(`[RESET] Deleted ${sessionCount.count} sessions`)
    
    const accountCount = await db.account.deleteMany()
    console.log(`[RESET] Deleted ${accountCount.count} accounts`)
    
    const auditCount = await db.auditLog.deleteMany()
    console.log(`[RESET] Deleted ${auditCount.count} audit logs`)
    
    const prefCount = await db.userPreference.deleteMany()
    console.log(`[RESET] Deleted ${prefCount.count} user preferences`)
    
    const userCount = await db.user.deleteMany()
    console.log(`[RESET] Deleted ${userCount.count} users`)
    
    const tokenCount = await db.verificationToken.deleteMany()
    console.log(`[RESET] Deleted ${tokenCount.count} verification tokens`)
    
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
