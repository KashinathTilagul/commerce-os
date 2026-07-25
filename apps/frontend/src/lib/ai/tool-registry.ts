import { AITool } from './types'

export class ToolRegistry {
  private static tools = new Map<string, AITool>()

  static register(tool: AITool) {
    this.tools.set(tool.name, tool)
  }

  static getTool(name: string): AITool | undefined {
    return this.tools.get(name)
  }

  static getAllTools(): AITool[] {
    return Array.from(this.tools.values())
  }
}
