export function parseFluxTurn(payload: unknown): { text: string; final: boolean } | null {
  if (!payload || typeof payload !== 'object') return null
  const turn = payload as { type?: unknown; event?: unknown; transcript?: unknown }
  if (turn.type !== 'TurnInfo' || typeof turn.transcript !== 'string') return null
  const text = turn.transcript.trim()
  if (!text) return null
  return { text, final: turn.event === 'EndOfTurn' }
}

export function decodePcm16Chunk(
  chunk: ArrayBuffer,
  carry: Uint8Array<ArrayBuffer> = new Uint8Array(),
): {
  samples: Float32Array<ArrayBuffer>
  carry: Uint8Array<ArrayBuffer>
} {
  const incoming = new Uint8Array(chunk)
  const bytes = new Uint8Array(carry.length + incoming.length)
  bytes.set(carry)
  bytes.set(incoming, carry.length)
  const evenLength = bytes.length - (bytes.length % 2)
  const samples = new Float32Array(evenLength / 2)
  const view = new DataView(bytes.buffer, bytes.byteOffset, evenLength)
  for (let index = 0; index < samples.length; index++) {
    samples[index] = view.getInt16(index * 2, true) / 32768
  }
  const nextCarry = new Uint8Array(bytes.length - evenLength)
  nextCarry.set(bytes.subarray(evenLength))
  return { samples, carry: nextCarry }
}
