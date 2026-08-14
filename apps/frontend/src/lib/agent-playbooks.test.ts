import assert from 'node:assert/strict'
import test from 'node:test'
import { PLAYBOOKS } from './agent-playbooks'
import { ROSTER } from './agent-roster'

test('validates all playbooks against 65-person digital roster', () => {
  assert.ok(PLAYBOOKS.length >= 4, 'Must define core domain playbooks')

  const validCodes = new Set(ROSTER.map((agent) => agent.code))

  for (const playbook of PLAYBOOKS) {
    assert.ok(
      validCodes.has(playbook.leadAgentCode),
      `Playbook ${playbook.key} leadAgentCode ${playbook.leadAgentCode} must exist in ROSTER`
    )

    for (const collab of playbook.collaboratorCodes) {
      assert.ok(
        validCodes.has(collab),
        `Playbook ${playbook.key} collaboratorCode ${collab} must exist in ROSTER`
      )
    }

    assert.ok(playbook.cronIntervalHours > 0, `Playbook ${playbook.key} must have positive interval`)
  }
})

test('verifies executive brief has email digest enabled', () => {
  const execBrief = PLAYBOOKS.find((p) => p.key === 'DAILY_EXECUTIVE_BRIEF')
  assert.ok(execBrief, 'DAILY_EXECUTIVE_BRIEF must be registered')
  assert.equal(execBrief.sendEmailDigest, true, 'DAILY_EXECUTIVE_BRIEF must send email digest')
  assert.equal(execBrief.leadAgentCode, 'CEO')
})
