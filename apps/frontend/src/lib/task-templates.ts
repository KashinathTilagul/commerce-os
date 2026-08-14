// Task decomposition templates - Deterministic task breakdown

const TASK_TEMPLATES: Record<string, {
  subtasks: Array<{ title: string; dept: string; order: number }>
  dependencies: number[][]
}> = {
  CAMPAIGN_LAUNCH: {
    subtasks: [
      { title: 'Design campaign visuals', dept: 'CREATIVE', order: 1 },
      { title: 'Write campaign copy', dept: 'MARKETING', order: 2 },
      { title: 'Set up tracking parameters', dept: 'TECHNOLOGY', order: 3 },
      { title: 'Allocate budget', dept: 'FINANCE', order: 4 },
      { title: 'Schedule posts', dept: 'MARKETING', order: 5 }
    ],
    dependencies: [[1, 2], [1, 3]]
  },
  PRODUCT_LAUNCH: {
    subtasks: [
      { title: 'Create product listing', dept: 'CREATIVE', order: 1 },
      { title: 'Set pricing strategy', dept: 'FINANCE', order: 2 },
      { title: 'Inventory planning', dept: 'OPERATIONS', order: 3 },
      { title: 'Launch announcement', dept: 'MARKETING', order: 4 },
      { title: 'Support documentation', dept: 'CUSTOMER', order: 5 }
    ],
    dependencies: [[2, 3], [1, 4]]
  },
  CONTENT_CREATION: {
    subtasks: [
      { title: 'Research topic', dept: 'RESEARCH', order: 1 },
      { title: 'Create content draft', dept: 'MARKETING', order: 2 },
      { title: 'Design visuals', dept: 'CREATIVE', order: 3 },
      { title: 'Review and approve', dept: 'EXECUTIVE', order: 4 },
      { title: 'Publish and distribute', dept: 'MARKETING', order: 5 }
    ],
    dependencies: [[1, 2], [2, 3], [3, 4]]
  },
  BUG_FIX: {
    subtasks: [
      { title: 'Reproduce issue', dept: 'TECHNOLOGY', order: 1 },
      { title: 'Identify root cause', dept: 'TECHNOLOGY', order: 2 },
      { title: 'Implement fix', dept: 'TECHNOLOGY', order: 3 },
      { title: 'Test fix', dept: 'TECHNOLOGY', order: 4 },
      { title: 'Deploy fix', dept: 'TECHNOLOGY', order: 5 }
    ],
    dependencies: [[1, 2], [2, 3], [3, 4], [4, 5]]
  },
  REPORT_GENERATION: {
    subtasks: [
      { title: 'Gather data', dept: 'FINANCE', order: 1 },
      { title: 'Analyze metrics', dept: 'GROWTH', order: 2 },
      { title: 'Create visualizations', dept: 'CREATIVE', order: 3 },
      { title: 'Write summary', dept: 'EXECUTIVE', order: 4 },
      { title: 'Format and export', dept: 'TECHNOLOGY', order: 5 }
    ],
    dependencies: [[1, 2], [2, 3], [3, 4]]
  },
  FEATURE_BUILD: {
    subtasks: [
      { title: 'Define requirements', dept: 'TECHNOLOGY', order: 1 },
      { title: 'Design architecture', dept: 'TECHNOLOGY', order: 2 },
      { title: 'Implement feature', dept: 'TECHNOLOGY', order: 3 },
      { title: 'Write tests', dept: 'TECHNOLOGY', order: 4 },
      { title: 'Deploy to production', dept: 'TECHNOLOGY', order: 5 }
    ],
    dependencies: [[1, 2], [2, 3], [3, 4], [4, 5]]
  },
  INTEGRATION: {
    subtasks: [
      { title: 'Research API', dept: 'TECHNOLOGY', order: 1 },
      { title: 'Design integration', dept: 'TECHNOLOGY', order: 2 },
      { title: 'Implement connection', dept: 'TECHNOLOGY', order: 3 },
      { title: 'Test integration', dept: 'TECHNOLOGY', order: 4 },
      { title: 'Monitor and document', dept: 'TECHNOLOGY', order: 5 }
    ],
    dependencies: [[1, 2], [2, 3], [3, 4]]
  }
}

export interface SubtaskDefinition {
  title: string
  department: string
  order: number
  dependsOn: number[]
}

export function decomposeTask(taskType: string, projectContext: Record<string, any>): SubtaskDefinition[] {
  const template = TASK_TEMPLATES[taskType] || TASK_TEMPLATES['CONTENT_CREATION']

  return template.subtasks.map(task => ({
    title: task.title,
    department: task.dept,
    order: task.order,
    dependsOn: template.dependencies
      .filter(d => d[1] === task.order)
      .map(d => d[0])
  }))
}
