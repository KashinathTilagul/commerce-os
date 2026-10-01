export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id


    const user = await db.user.findUnique({ where: { id: userId }, select: { organizationId: true, orgRole: true } })
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    if (user.organizationId && user.orgRole === 'FOUNDER') {
      return NextResponse.json({ error: 'Transfer organization ownership before deleting your account' }, { status: 409 })
    }

    await db.$transaction(async (tx) => {
      // Account removal never deletes organization-owned business records.
      
      await tx.auditLog.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })


    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })
  } catch (error: any) {
    console.error('[DELETE ACCOUNT] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete account', 
      details: error.message 
    }, { status: 500 })
  }
}
