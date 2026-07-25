import { ToolRegistry } from './tool-registry'
import { ToolResolution } from './types'

export class ToolResolver {
  static resolve(toolNames: string[], organizationId: string): ToolResolution[] {
    const resolutions: ToolResolution[] = []

    for (const name of toolNames) {
      const tool = ToolRegistry.getTool(name)
      if (tool) {
        resolutions.push({
          tool,
          metadata: { organizationId, resolvedAt: Date.now() }
        })
      }
    }

    return resolutions
  }
}
