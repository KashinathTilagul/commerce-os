// Smoke check for the UGC reel pipeline: two synthetic stills + real local
// TTS → assembleReel → one MP4 with motion, dialogue and music.
// Run: node --import tsx --env-file=.env scripts/smoke-reel.ts  (from apps/frontend)
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const tmp = path.join(process.cwd(), 'storage', 'temp')

async function main() {
await fs.mkdir(tmp, { recursive: true })

for (const [i, color] of ['#C0342C', '#0047AB'].entries()) {
  const svg = `<svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#000000"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="360" cy="${420 + i * 320}" r="130" fill="#FFFFFF" opacity="0.85"/>
</svg>`
  await sharp(Buffer.from(svg)).png().toFile(path.join(tmp, `smoke-scene-${i}.png`))
}

const { synthesizeSpeech } = await import('../src/lib/audio-generator')
const { generateVideo } = await import('../src/lib/video-generator')
const { db } = await import('../src/lib/db')

const org = await db.organization.findFirst({ select: { id: true } })
if (!org) throw new Error('no organization in DB')

const vo1 = await synthesizeSpeech('One time. Chosen with intent.')
const vo2 = await synthesizeSpeech('All time. Worn forever. This is Ekvaar.')
console.log('voiceovers:', vo1?.provider, vo2?.provider)
if (!vo1 || !vo2) throw new Error('TTS produced no audio — reel dialogue would be silent')

const started = Date.now()
const result = await generateVideo({
  template: 'InstagramReel',
  data: {},
  duration: 12,
  organizationId: org.id,
  title: 'smoke reel',
  scenes: [
    { imagePath: path.join(tmp, 'smoke-scene-0.png'), voicePath: vo1.path, line: 'One time. Chosen with intent.' },
    { imagePath: path.join(tmp, 'smoke-scene-1.png'), voicePath: vo2.path, line: 'All time. Worn forever. This is Ekvaar.' },
  ],
})
console.log(`rendered in ${Date.now() - started}ms ->`, result)

const artifact = await db.artifact.findUnique({ where: { id: result.artifactId }, select: { storageLocation: true, byteSize: true } })
console.log('stored:', artifact?.storageLocation, `${artifact?.byteSize} bytes`)
if (!artifact?.storageLocation || artifact.byteSize < 50000) throw new Error('reel output missing or suspiciously small')
await db.$disconnect()
}

main().catch((error) => { console.error(error); process.exit(1) })
