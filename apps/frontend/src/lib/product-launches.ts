import { db } from '@/lib/db'
export { nextLaunchCode } from './product-launch-code'
import { nextLaunchCode } from './product-launch-code'

const QIKINK_DASHBOARD_URL = 'https://dashboard.qikink.com'

export async function queueQikinkDraft(launchId: string, organizationId: string) {
  const launch = await db.productLaunch.findFirst({ where: { id: launchId, organizationId } })
  if (!launch) throw new Error('Launch not found')
  if (!launch.designArtifactId) throw new Error('Attach an approved print-ready design before preparing Qikink.')
  if (!['SKU_PLANNED', 'BLOCKED'].includes(launch.status)) {
    throw new Error(`Qikink draft cannot start from ${launch.status}`)
  }

  const job = await db.browseJob.create({
    data: {
      organizationId,
      agentCode: 'COO',
      url: QIKINK_DASHBOARD_URL,
      action: 'qikink-product-draft',
      actionData: JSON.stringify({
        launchId: launch.id,
        launchCode: launch.code,
        productType: launch.productType,
        templateKey: launch.templateKey,
        designArtifactId: launch.designArtifactId,
        // This task must run in the paired local signed-in Chrome profile.
        task: `Open Qikink and create a product draft for ${launch.code}. Upload only the approved launch artwork, select the ${launch.productType} template (${launch.templateKey}), configure its approved variants and stop before Push to Store. Return the Qikink draft product ID and a screenshot reference. Do not publish or push to Shopify.`,
      }),
      priority: 2,
    },
  })

  return db.productLaunch.update({
    where: { id: launch.id },
    data: { status: 'QIKINK_DRAFTING', browserJobId: job.id, blockedReason: null },
  })
}
