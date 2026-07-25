import { WorkforceAgent } from '../agent-base'

export class CEOAgent extends WorkforceAgent {
  getAgentName(): string {
    return 'CEO_AGENT'
  }

  getPromptName(): string {
    return 'ceo_system_prompt'
  }

  getTools(): string[] {
    return ['business_snapshot_tool', 'workflow_engine_tool']
  }
}
