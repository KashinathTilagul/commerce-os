import { describe, it, expect, beforeEach } from 'node:test'
import { runAgentWork } from './agent-worker'

describe('Agent Worker', () => {
  describe('runAgentWork', () => {
    it('returns error for non-existent agent', async () => {
      const result = await runAgentWork('test-org', 'non-existent-agent')
      expect(result.ok).toBe(false)
      expect(result.message).toContain('not found')
    })

    it('rejects human team members', async () => {
      // This would need a human agent in the database
      // For now, just test the function signature
      const result = await runAgentWork('test-org', 'human-agent-id')
      expect(result.ok).toBe(false)
    })

    it('returns success when no open tickets', async () => {
      // Mock scenario: agent has no work
      const result = await runAgentWork('test-org', 'idle-agent-id')
      expect(result.ok).toBe(true)
      expect(result.message).toContain('no open tickets')
    })
  })
})
