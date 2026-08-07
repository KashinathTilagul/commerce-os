'use client'

import { useState } from 'react'
import { WorkforceShell, type Section } from './workforce/workforce-shell'
import { OverviewPage } from './workforce/overview/overview-page'
import { AgentList } from './workforce/agents/agent-list'
import { AgentWorkspace } from './workforce/agents/workspace/agent-workspace'
import { IssuesPage } from './workforce/work/issues-page'
import { GoalsPage } from './workforce/work/goals-page'
import { ProjectsPage } from './workforce/work/projects-page'
import { ApprovalsPage } from './workforce/approvals/approvals-page'
import { ActivityFeed } from './workforce/activity/activity-feed'
import { CostsPage } from './workforce/costs/costs-page'
import { OrgChartCanvas } from './workforce/org-chart/org-chart-canvas'
import { WorkforceSettings } from './workforce/settings/workforce-settings'
import { GlassPanel } from '@/components/ui/glass-system'

export function DigitalEmployeesHub() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  return (
    <WorkforceShell>
      {(section, setSection) => {
        if (section === 'agents' && selectedAgentId) {
          return (
            <AgentWorkspace
              agentId={selectedAgentId}
              onBack={() => setSelectedAgentId(null)}
            />
          )
        }

        switch (section) {
          case 'overview':
            return <OverviewPage onNavigate={(sec) => { setSection(sec); setSelectedAgentId(null) }} />
          case 'agents':
            return <AgentList onSelectAgent={(id) => setSelectedAgentId(id)} />
          case 'org-chart':
            return <OrgChartCanvas onSelectAgent={(id) => { setSelectedAgentId(id); setSection('agents') }} />
          case 'goals':
            return <GoalsPage />
          case 'projects':
            return <ProjectsPage />
          case 'issues':
            return <IssuesPage />
          case 'approvals':
            return <ApprovalsPage />
          case 'activity':
            return <ActivityFeed />
          case 'costs':
            return <CostsPage />
          case 'settings':
            return <WorkforceSettings />
          default:
            return <AgentList onSelectAgent={(id) => setSelectedAgentId(id)} />
        }
      }}
    </WorkforceShell>
  )
}
