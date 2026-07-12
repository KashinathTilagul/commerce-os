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

    console.log(`[DELETE ACCOUNT] Deleting account for user: ${userId}`)

    await db.$transaction(async (tx) => {
      await tx.toolExecution.deleteMany({ where: { integration: { userId } } })
      await tx.event.deleteMany({ where: { userId } })
      await tx.issueComment.deleteMany({ where: { issue: { userId } } })
      await tx.issue.deleteMany({ where: { userId } })
      await tx.approval.deleteMany({ where: { userId } })
      await tx.orderItem.deleteMany({ where: { order: { userId } } })
      await tx.order.deleteMany({ where: { userId } })
      await tx.product.deleteMany({ where: { userId } })
      await tx.customer.deleteMany({ where: { userId } })
      await tx.transaction.deleteMany({ where: { userId } })
      await tx.campaign.deleteMany({ where: { userId } })
      await tx.founderNote.deleteMany({ where: { userId } })
      await tx.restoration.deleteMany({ where: { userId } })
      await tx.supplier.deleteMany({ where: { userId } })
      await tx.aISystem.deleteMany({ where: { userId } })
      await tx.brandCheck.deleteMany({ where: { userId } })
      await tx.integration.deleteMany({ where: { userId } })
      await tx.agent.deleteMany({ where: { userId } })
      await tx.userPreference.deleteMany({ where: { userId } })
      await tx.auditLog.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    console.log(`[DELETE ACCOUNT] Successfully deleted account: ${userId}`)

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
