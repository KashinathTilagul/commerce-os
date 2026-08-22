import assert from 'node:assert/strict'
import test from 'node:test'
import { decodePcm16Chunk, parseFluxTurn } from './deepgram-voice'

test('recognizes only final Flux turns as final', () => {
  assert.deepEqual(parseFluxTurn({ type: 'TurnInfo', event: 'Update', transcript: ' hello ' }), { text: 'hello', final: false })
  assert.deepEqual(parseFluxTurn({ type: 'TurnInfo', event: 'EndOfTurn', transcript: 'hello' }), { text: 'hello', final: true })
  assert.equal(parseFluxTurn({ type: 'Connected' }), null)
})

test('preserves split PCM samples across websocket frames', () => {
  const first = decodePcm16Chunk(Uint8Array.of(0xff).buffer)
  assert.equal(first.samples.length, 0)
  assert.equal(first.carry.length, 1)
  const second = decodePcm16Chunk(Uint8Array.of(0x7f, 0x00, 0x80).buffer, first.carry)
  assert.ok(second.samples[0] > 0.99)
  assert.ok(second.samples[1] <= -1)
  assert.equal(second.carry.length, 0)
})
