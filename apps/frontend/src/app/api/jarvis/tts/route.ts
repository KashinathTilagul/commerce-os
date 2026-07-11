// TTS requests are routed directly to FastAPI via nginx (/api/jarvis/tts → fastapi:8000)
// This file is intentionally empty — nginx handles the routing before Next.js sees it.
export const runtime = 'edge'
export async function POST() {
  return new Response('routed to fastapi', { status: 404 })
}
