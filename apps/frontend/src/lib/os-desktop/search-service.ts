import { AppRegistry } from './registry'

export interface GlobalSearchResult {
  id: string
  type: 'app' | 'command' | 'setting' | 'workspace' | 'notification'
  title: string
  subtitle?: string
  icon?: any
  action: () => void
}

export interface SemanticSearchResult {
  id: string
  type: 'memory' | 'campaign' | 'workflow' | 'document' | 'design'
  title: string
  context: string
  score: number
}

class OSSearchService {
  /**
   * Fast, exact/fuzzy search for local desktop objects (Apps, Intents, Shortcuts).
   */
  async searchGlobal(query: string): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = []
    const lowerQuery = query.toLowerCase()

    // 1. Search Apps
    const apps = AppRegistry.getAllApps()
    for (const app of apps) {
      if (app.name.toLowerCase().includes(lowerQuery) || app.description?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `app_${app.id}`,
          type: 'app',
          title: app.name,
          subtitle: app.description || 'Application',
          action: () => {
            // we will hook this up to WindowManager open
            console.log(`Open app ${app.id}`)
          }
        })
      }
    }

    // 2. Search Intents (Commands)
    const intents = AppRegistry.intents.getAll()
    for (const intent of intents) {
      if (intent.title.toLowerCase().includes(lowerQuery) || intent.aliases.some(a => a.toLowerCase().includes(lowerQuery))) {
        results.push({
          id: `intent_${intent.id}`,
          type: 'command',
          title: intent.title,
          subtitle: 'Command',
          action: () => {
            intent.handler({}) // Payload will be resolved by intent logic
          }
        })
      }
    }

    return results
  }

  /**
   * Deep semantic search hitting the Memory Engine backend.
   */
  async searchSemantic(query: string): Promise<SemanticSearchResult[]> {
    // In Phase 2, this will hit `GET /api/kernel/memory/search?q=${query}`
    // For now we mock the response signature
    console.log(`[SearchService] Executing semantic search for: ${query}`)
    
    // Mock response
    return [
      {
        id: 'mem_1',
        type: 'memory',
        title: 'Q3 Board Deck Guidelines',
        context: 'Mentions revenue targets and new hoodie designs.',
        score: 0.95
      }
    ]
  }
}

export const SearchService = new OSSearchService()
