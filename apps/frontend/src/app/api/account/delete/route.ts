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

    console.log(`[DELETE ACCOUNT] Deleting account for user: ${userId}`)

    const user = await db.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    const organizationId = user?.organizationId

    await db.$transaction(async (tx) => {
      if (organizationId) {
        await tx.toolExecution.deleteMany({ where: { integration: { organizationId } } })
        await tx.event.deleteMany({ where: { organizationId } })
        await tx.issueComment.deleteMany({ where: { issue: { organizationId } } })
        await tx.issue.deleteMany({ where: { organizationId } })
        await tx.approval.deleteMany({ where: { organizationId } })
        await tx.orderItem.deleteMany({ where: { order: { organizationId } } })
        await tx.order.deleteMany({ where: { organizationId } })
        await tx.product.deleteMany({ where: { organizationId } })
        await tx.customer.deleteMany({ where: { organizationId } })
        await tx.transaction.deleteMany({ where: { organizationId } })
        await tx.campaign.deleteMany({ where: { organizationId } })
        await tx.founderNote.deleteMany({ where: { organizationId } })
        await tx.restoration.deleteMany({ where: { organizationId } })
        await tx.supplier.deleteMany({ where: { organizationId } })
        await tx.aISystem.deleteMany({ where: { organizationId } })
        await tx.brandCheck.deleteMany({ where: { organizationId } })
        await tx.integration.deleteMany({ where: { organizationId } })
        await tx.agent.deleteMany({ where: { organizationId } })
      }
      
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
