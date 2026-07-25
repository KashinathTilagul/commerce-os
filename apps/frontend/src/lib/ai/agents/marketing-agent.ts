import { WorkforceAgent } from '../agent-base'

export class MarketingAgent extends WorkforceAgent {
  getAgentName(): string {
    return 'MARKETING_AGENT'
  }

  getPromptName(): string {
    return 'marketing_system_prompt'
  }

  getTools(): string[] {
    return ['campaign_manager_tool', 'customer_segments_tool']
  }
}
