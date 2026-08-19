import { createHmac, timingSafeEqual } from 'node:crypto'

function secret() {
  const value = process.env.ARTIFACT_SIGNING_SECRET || process.env.NEXTAUTH_SECRET
  if (!value) throw new Error('ARTIFACT_SIGNING_SECRET or NEXTAUTH_SECRET is required')
  return value
}

export function signArtifactId(id: string) {
  return createHmac('sha256', secret()).update(id).digest('base64url')
}

export function verifyArtifactSignature(id: string, signature: string) {
  const expected = signArtifactId(id)
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function publicArtifactUrl(baseUrl: string, id: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/public/artifacts/${encodeURIComponent(id)}?signature=${encodeURIComponent(signArtifactId(id))}`
}
