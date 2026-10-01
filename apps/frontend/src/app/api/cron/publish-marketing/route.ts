export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { publishDueMarketingTasks } from '@/lib/marketing-task-publisher'
import { isCronAuthorized } from '@/lib/cron-auth'

// POST /api/cron/publish-marketing — external cron entry point. Publishes
// every SCHEDULED marketing task whose time has come. The in-process interval
// in marketing-task-publisher covers deployments without external cron.
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const outcomes = await publishDueMarketingTasks()
  return NextResponse.json({
    published: outcomes.filter((o) => o.anySuccess).length,
    attempted: outcomes.length,
    outcomes: outcomes.map((o) => ({ taskId: o.task.id, results: o.results })),
  })
}
