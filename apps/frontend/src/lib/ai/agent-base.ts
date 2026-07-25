import { AIRuntime } from './runtime'

export abstract class WorkforceAgent {
  protected organizationId: string
  protected sessionId: string

  constructor(organizationId: string, sessionId: string) {
    this.organizationId = organizationId
    this.sessionId = sessionId
  }

  abstract getAgentName(): string
  abstract getPromptName(): string
  abstract getTools(): string[]

  async execute(query: string) {
    await this.validate(query)
    
    // In a full implementation, buildContext might do pre-processing.
    // For now, the AIRuntime handles ContextBuilder.
    await this.buildContext()
    
    return await this.run(query)
  }

  protected async buildContext() {
    // Hooks for agent-specific context extensions
  }

  protected async validate(query: string) {
    if (!query) throw new Error('Query is required')
  }

  protected async run(query: string) {
    return await AIRuntime.execute({
      organizationId: this.organizationId,
      sessionId: this.sessionId,
      agentName: this.getAgentName(),
      query: query,
      promptName: this.getPromptName(),
      tools: this.getTools()
    })
  }
}
