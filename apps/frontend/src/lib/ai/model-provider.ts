import { ModelProvider } from './types'
import { OpenAIProvider } from './providers/openai-provider'

export class ModelProviderFactory {
  static getProvider(name: string): ModelProvider {
    switch (name.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider()
      default:
        return new OpenAIProvider()
    }
  }
}
