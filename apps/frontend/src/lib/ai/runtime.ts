// @ts-nocheck
import { db } from '@/lib/db'
import { ContextBuilder, SqlRetrievalStrategy } from '@/lib/knowledge/context-builder'
import { ModelProviderFactory } from './model-provider'
import { PromptRegistry } from './prompt-registry'
import { ToolResolver } from './tool-resolver'
import { ToolExecutor } from './tool-executor'
import { AIExecutionContext } from './types'

export class AIRuntime {
  static async execute(params: {
    organizationId: string
    sessionId: string
    agentName: string
    query: string
    promptName: string
    modelName?: string
    tools?: string[]
  }) {
    const startTime = Date.now()
    
    // 1. Authentication & Organization Context
    const org = await db.organization.findUnique({
      where: { id: params.organizationId },
      include: { context: true }
    })
    
    if (!org) throw new Error('Organization not found')

    const context: AIExecutionContext = {
      organization: {
        organizationId: org.id,
        profile: org.context?.companyProfile || {},
        brand: org.context?.brandDna || {},
        policies: [], // would parse policies
        capabilities: (org.capabilities ? String(org.capabilities) : "").split(',')
      },
      session: {
        sessionId: params.sessionId,
        history: [] // load from session db
      },
      working: {},
      query: params.query
    }

    // 2. Context Builder (Retrieval)
    const contextBuilder = new ContextBuilder(new SqlRetrievalStrategy())
    const retrievedContext = await contextBuilder.build(params.query, params.organizationId)

    // 3. Prompt Registry
    const promptDef = await PromptRegistry.getPrompt(params.promptName, params.organizationId)

    // 4. Input Validation (Guardrails)
    if (!params.query || params.query.length > 5000) {
      throw new Error('Input validation failed')
    }

    // Prepare final strings
    const systemMessage = `${promptDef.systemPrompt}\n\nOrganization Context: ${JSON.stringify(context.organization)}\nRetrieved Knowledge: ${retrievedContext.summary}`
    
    // 5. Tool Resolution
    const resolvedTools = params.tools ? ToolResolver.resolve(params.tools, params.organizationId) : []

    // 6. Model Provider
    const provider = ModelProviderFactory.getProvider(params.modelName || 'openai')
    const response = await provider.generate(params.query, systemMessage, resolvedTools.map(r => r.tool))

    // 7. Tool Execution (if model requested)
    let toolExecutionTime = 0
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const call of response.toolCalls) {
        const resolution = resolvedTools.find(r => r.tool.name === call.name)
        if (resolution) {
          const result = await ToolExecutor.execute(resolution, call.arguments)
          toolExecutionTime += result.executionTimeMs
        }
      }
    }

    // 8. Output Validation
    if (!response.content) {
      throw new Error('Output validation failed: empty content')
    }

    const totalLatency = Date.now() - startTime

    // 9. Telemetry
    await db.aIExecutionLog.create({
      data: {
        organizationId: params.organizationId,
        agent: params.agentName,
        runtimeVersion: '1.0.0',
        promptVersion: promptDef.version,
        model: params.modelName || 'openai',
        provider: 'openai', // dynamic in future
        retrievedNodeCount: retrievedContext.nodes.length,
        toolsSelected: JSON.stringify(resolvedTools.map(t => t.tool.name)),
        toolExecutionTime,
        totalLatency,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        estimatedCost: response.usage.estimatedCost,
        success: true
      }
    })

    // 10. Response
    return {
      content: response.content,
      telemetry: { totalLatency }
    }
  }
}
