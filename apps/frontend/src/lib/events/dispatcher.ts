import { db } from '@/lib/db'

export async function dispatchEvent(type: string, source: string, payload: any) {
  try {
    await db.systemEvent.create({
      data: {
        type,
        source,
        payload: JSON.stringify(payload),
      },
    })
    console.log(`[Event Dispatcher] Emitted ${type} from ${source}`)
  } catch (error) {
    console.error(`[Event Dispatcher] Failed to emit event ${type}`, error)
  }
}
