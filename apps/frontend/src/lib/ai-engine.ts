import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { db } from './db'

/**
 * Dynamically gets the AWS Bedrock instance configured in the OS settings.
 */
export async function getBedrockEngine() {
  const cfg = await db.systemSetting.findUnique({ where: { id: 'global' } })
  const apiKey = cfg?.primaryApiKey || process.env.OPENCODE_API_KEY || ''
  const modelStr = cfg?.primaryModel && cfg.primaryModel.includes('glm') 
    ? cfg.primaryModel 
    : 'amazon-bedrock/zai.glm-5'

  if (!apiKey) {
    throw new Error('No AWS Bedrock API Key configured. Please add it in Settings.')
  }

  let finalApiKey = apiKey
  if (apiKey.length > 40 && apiKey.endsWith('=') && !apiKey.includes(' ')) {
    try {
      const decoded = Buffer.from(apiKey, 'base64').toString('utf8')
      if (decoded.includes('BedrockAPIKey') || decoded.includes(':')) {
        finalApiKey = decoded.replace(/^[^a-zA-Z0-9]+/, '')
      }
    } catch (e) {}
  }

  const bedrock = createAmazonBedrock({
    apiKey: finalApiKey,
    region: 'us-east-1',
  })

  return { bedrock, modelId: modelStr.replace('amazon-bedrock/', '') }
}

/**
 * Generates structured mock/dynamic data for an OS app using the LLM.
 */
export async function generateAppInsights<T>(
  context: string,
  schema: z.ZodType<T>,
  prompt: string
): Promise<T> {
  const { bedrock, modelId } = await getBedrockEngine()

  const { object } = await generateObject({
    model: bedrock(modelId),
    schema,
    system: `You are the central intelligence of EKVAAR OS. You generate highly realistic, deeply contextual data for the operating system modules. Ensure numbers make sense, text is professional and aligned with a luxury fashion house, and the output strictly matches the requested schema. Context: ${context}`,
    prompt,
    temperature: 0.7,
  })

  return object
}

/**
 * Generates raw text insights for an OS app using the LLM.
 */
export async function generateTextInsights(
  context: string,
  prompt: string
): Promise<string> {
  const { bedrock, modelId } = await getBedrockEngine()

  const { text } = await generateText({
    model: bedrock(modelId),
    system: `You are the central intelligence of EKVAAR OS, generating concise, structural analysis for the fashion house. Focus on permanent value, strict discipline, and clear actionable intelligence. Avoid generic fluff. Context: ${context}`,
    prompt,
    temperature: 0.7,
  })

  return text
}
