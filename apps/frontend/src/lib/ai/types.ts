export interface OrganizationMemory {
  organizationId: string
  profile: any
  brand: any
  policies: any[]
  capabilities: string[]
}

export interface SessionMemory {
  sessionId: string
  userId?: string
  history: any[]
}

export interface WorkingMemory {
  [key: string]: any
}

export interface AIExecutionContext {
  organization: OrganizationMemory
  session: SessionMemory
  working: WorkingMemory
  query: string
}

export interface ModelProviderResponse {
  content: string
  toolCalls?: any[]
  usage: { inputTokens: number; outputTokens: number; estimatedCost: number }
}

export interface ModelProvider {
  generate(prompt: string, system: string, tools?: any[]): Promise<ModelProviderResponse>
  stream(prompt: string, system: string, tools?: any[]): any // placeholder for future streaming
  healthCheck(): Promise<boolean>
}

export interface AITool {
  name: string
  description: string
  parameters: any // JSON schema
}

export interface ToolResolution {
  tool: AITool
  metadata: any
}

export interface ToolExecutorResponse {
  success: boolean
  data: any
  executionTimeMs: number
}
