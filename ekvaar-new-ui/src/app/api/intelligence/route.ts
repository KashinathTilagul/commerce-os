import { NextResponse } from 'next/server'

// Intelligence Layer — routing and logic core for all LLM calls
export async function GET() {
  return NextResponse.json({
    engine: 'intelligence_layer',
    status: 'ACTIVE',
    version: '4.2.0',
    primaryModel: 'claude-sonnet-4.5',
    fallbackModel: 'glm-4',
    endpoints: {
      chat: '/api/v1/intelligence/chat',
      embed: '/api/v1/intelligence/embed',
      route: '/api/v1/intelligence/route',
    },
    routing: {
      strategy: 'cost_optimized',
      maxTokensPerCall: 8192,
      dailyTokenBudget: 5000000,
      dailyTokensUsed: 2840000,
    },
    capabilities: [
      'model_routing',
      'context_compression',
      'skill_injection',
      'memory_retrieval',
      'streaming_response',
      'cost_tracking',
    ],
  })
}
