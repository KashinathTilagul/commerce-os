import { db } from '@/lib/db'

interface WorkflowTask {
  id: string
  workflowId: string
  assigneeType: string
  assigneeId: string | null
  status: string
  dependencies: string
}

interface DAGTransitionRule {
  fromStatus: string
  toStatus: string
  condition: (task: WorkflowTask, allTasks: WorkflowTask[]) => boolean
  action: (task: WorkflowTask) => Promise<void>
}

export class WorkflowAutomationEngine {
  private transitionRules: DAGTransitionRule[] = [
    {
      fromStatus: 'PENDING',
      toStatus: 'RUNNING',
      condition: (task, allTasks) => {
        // Task can start if all dependencies are DONE
        const dependencies = JSON.parse(task.dependencies || '[]') as string[]
        const dependencyTasks = allTasks.filter(t => dependencies.includes(t.id))
        return dependencyTasks.every(dep => dep.status === 'DONE')
      },
      action: async (task) => {
        // Dispatch task to assignee (agent/human/system)
        if (task.assigneeType === 'AGENT' && task.assigneeId) {
          await this.dispatchToAgent(task)
        } else if (task.assigneeType === 'SYSTEM') {
          await this.executeSystemTask(task)
        }
        // For HUMAN tasks, just mark as RUNNING and notify
      },
    },
    {
      fromStatus: 'RUNNING',
      toStatus: 'DONE',
      condition: (task) => {
        // Task marked as done by external completion
        return task.status === 'DONE'
      },
      action: async () => {
        // No action needed, just transition
      },
    },
    {
      fromStatus: 'RUNNING',
      toStatus: 'FAILED',
      condition: (task) => {
        // Task marked as failed by external error
        return task.status === 'FAILED'
      },
      action: async (task, allTasks) => {
        // Block dependent tasks
        const dependents = allTasks.filter(t => 
          JSON.parse(t.dependencies || '[]').includes(task.id)
        )
        await this.blockDependentTasks(dependents)
      },
    },
  ]

  async processWorkflow(workflowId: string): Promise<void> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { tasks: true },
    })

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (workflow.status === 'COMPLETED' || workflow.status === 'FAILED') {
      return // No processing needed for terminal states
    }

    const tasks = workflow.tasks as WorkflowTask[]
    let workflowUpdated = false

    // Process each task through transition rules
    for (const task of tasks) {
      for (const rule of this.transitionRules) {
        if (task.status === rule.fromStatus && rule.condition(task, tasks)) {
          try {
            await rule.action(task, tasks)
            
            // Update task status
            await db.workflowTask.update({
              where: { id: task.id },
              data: { status: rule.toStatus },
            })
            
            workflowUpdated = true
            break // Only apply first matching rule
          } catch (error) {
            console.error(`[WorkflowAutomation] Failed to process task ${task.id}:`, error)
            // Mark task as failed if automation fails
            await db.workflowTask.update({
              where: { id: task.id },
              data: { status: 'FAILED' },
            })
          }
        }
      }
    }

    // Update workflow status based on task statuses
    if (workflowUpdated) {
      await this.updateWorkflowStatus(workflowId)
    }
  }

  private async updateWorkflowStatus(workflowId: string): Promise<void> {
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { tasks: true },
    })

    if (!workflow) return

    const tasks = workflow.tasks
    const allDone = tasks.every(t => t.status === 'DONE')
    const anyFailed = tasks.some(t => t.status === 'FAILED')
    const anyRunning = tasks.some(t => t.status === 'RUNNING')
    const allPending = tasks.every(t => t.status === 'PENDING')

    let newStatus = workflow.status

    if (allDone) {
      newStatus = 'COMPLETED'
    } else if (anyFailed) {
      newStatus = 'FAILED'
    } else if (anyRunning) {
      newStatus = 'RUNNING'
    } else if (!allPending) {
      newStatus = 'RUNNING' // Some done, some pending
    }

    if (newStatus !== workflow.status) {
      await db.workflow.update({
        where: { id: workflowId },
        data: { status: newStatus },
      })
    }
  }

  private async dispatchToAgent(task: WorkflowTask): Promise<void> {
    if (!task.assigneeId) return

    // Create an issue for the agent
    const graphDef = await db.workflow.findUnique({
      where: { id: task.workflowId },
      select: { graphDef: true },
    })

    const workflowData = JSON.parse(graphDef?.graphDef || '{}')
    const taskData = workflowData.tasks?.[task.id] || {}

    await db.issue.create({
      data: {
        organizationId: (await db.workflow.findUnique({
          where: { id: task.workflowId },
          select: { organizationId: true },
        }))!.organizationId,
        title: taskData.title || `Workflow Task ${task.id}`,
        description: taskData.description || '',
        status: 'BACKLOG',
        priority: taskData.priority || 'P2',
        assignedAgentId: task.assigneeId,
        workflowTaskId: task.id,
      },
    })
  }

  private async executeSystemTask(task: WorkflowTask): Promise<void> {
    // Execute system tasks (automated operations)
    const graphDef = await db.workflow.findUnique({
      where: { id: task.workflowId },
      select: { graphDef: true },
    })

    const workflowData = JSON.parse(graphDef?.graphDef || '{}')
    const taskData = workflowData.tasks?.[task.id] || {}

    // Execute based on task type
    switch (taskData.type) {
      case 'NOTIFICATION':
        await this.sendNotification(taskData)
        break
      case 'WEBHOOK':
        await this.callWebhook(taskData)
        break
      case 'CALCULATION':
        await this.performCalculation(taskData)
        break
      default:
        console.log(`[WorkflowAutomation] Unknown system task type: ${taskData.type}`)
    }
  }

  private async sendNotification(taskData: any): Promise<void> {
    // Implement notification logic
    console.log(`[WorkflowAutomation] Sending notification:`, taskData)
  }

  private async callWebhook(taskData: any): Promise<void> {
    // Implement webhook call
    if (taskData.url) {
      try {
        await fetch(taskData.url, {
          method: taskData.method || 'POST',
          headers: taskData.headers || {},
          body: JSON.stringify(taskData.body || {}),
        })
      } catch (error) {
        console.error(`[WorkflowAutomation] Webhook call failed:`, error)
        throw error
      }
    }
  }

  private async performCalculation(taskData: any): Promise<void> {
    // Implement calculation logic
    console.log(`[WorkflowAutomation] Performing calculation:`, taskData)
  }

  private async blockDependentTasks(tasks: WorkflowTask[]): Promise<void> {
    for (const task of tasks) {
      await db.workflowTask.update({
        where: { id: task.id },
        data: { status: 'BLOCKED' },
      })
    }
  }

  async triggerWorkflow(workflowId: string): Promise<void> {
    // Initial workflow trigger
    await this.processWorkflow(workflowId)
  }

  async completeTask(taskId: string, success: boolean = true): Promise<void> {
    const task = await db.workflowTask.findUnique({
      where: { id: taskId },
      include: { workflow: true },
    })

    if (!task) return

    // Update task status
    await db.workflowTask.update({
      where: { id: taskId },
      data: { status: success ? 'DONE' : 'FAILED' },
    })

    // Process workflow to trigger dependent tasks
    await this.processWorkflow(task.workflowId)
  }
}

// Singleton instance
export const workflowAutomation = new WorkflowAutomationEngine()

// API route helper
export async function handleWorkflowEvent(workflowId: string, eventType: string, data?: any): Promise<void> {
  switch (eventType) {
    case 'TASK_COMPLETED':
      if (data?.taskId) {
        await workflowAutomation.completeTask(data.taskId, data.success !== false)
      }
      break
    case 'WORKFLOW_TRIGGER':
      await workflowAutomation.triggerWorkflow(workflowId)
      break
    default:
      console.log(`[WorkflowAutomation] Unknown event type: ${eventType}`)
  }
}