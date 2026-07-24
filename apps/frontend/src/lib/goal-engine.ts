import { db } from '@/lib/db'

export async function createGoal(userId: string, data: {
  title: string
  metric: string
  targetValue: number
  unit?: string
  mode: string
  agentCode: string
  skillSlug?: string
  interval?: number
  deadline?: Date
}) {
  return db.goal.create({
    data: {
      userId,
      title: data.title,
      metric: data.metric,
      targetValue: data.targetValue,
      unit: data.unit ?? '',
      mode: data.mode,
      agentCode: data.agentCode,
      skillSlug: data.skillSlug,
      interval: data.interval ?? 86400,
      deadline: data.deadline,
      nextRunAt: new Date(),
      status: 'ACTIVE'
    }
  })
}

export async function runGoalIteration(goalId: string, measuredValue?: number, actionDetails?: string) {
  const goal = await db.goal.findUnique({ where: { id: goalId } })
  if (!goal) throw new Error('Goal not found')
  
  const iterationCount = await db.goalIteration.count({ where: { goalId } })
  
  // Mock measure if not provided
  const val = measuredValue ?? (goal.currentValue + (Math.random() * 10 - 5))
  const delta = val - goal.currentValue
  
  const iteration = await db.goalIteration.create({
    data: {
      goalId,
      iteration: iterationCount + 1,
      measuredValue: val,
      delta,
      action: actionDetails ?? 'Executed skill ' + (goal.skillSlug || 'default'),
      outcome: 'Iteration completed',
      score: delta > 0 ? 1 : -1
    }
  })

  await db.goal.update({
    where: { id: goalId },
    data: {
      currentValue: val,
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + (goal.interval * 1000))
    }
  })
  
  return iteration
}

export async function checkGoalStatus(goalId: string) {
  const goal = await db.goal.findUnique({ where: { id: goalId } })
  if (!goal) return null
  
  let newStatus = goal.status
  if (goal.mode === 'ACHIEVE') {
    // For simplicity, say it's achieved if current matches target closely
    if (Math.abs(goal.currentValue - goal.targetValue) < 0.1) {
      newStatus = 'ACHIEVED'
    }
  } else if (goal.mode === 'MAINTAIN') {
    // Check if within some bounds
    if (Math.abs(goal.currentValue - goal.targetValue) > goal.targetValue * 0.2) {
      // out of bounds, maybe FAILED? Or just ACTIVE but struggling
    }
  }

  if (newStatus !== goal.status) {
    await db.goal.update({ where: { id: goalId }, data: { status: newStatus } })
  }
  return newStatus
}

export async function pauseGoal(goalId: string) {
  return db.goal.update({ where: { id: goalId }, data: { status: 'PAUSED' } })
}

export async function resumeGoal(goalId: string) {
  return db.goal.update({ where: { id: goalId }, data: { status: 'ACTIVE' } })
}

export async function getGoalWithIterations(userId: string, goalId: string) {
  return db.goal.findUnique({
    where: { id: goalId, userId },
    include: {
      iterations: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

export async function getDueGoals() {
  return db.goal.findMany({
    where: {
      status: 'ACTIVE',
      nextRunAt: { lte: new Date() }
    }
  })
}
