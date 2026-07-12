import { NextResponse } from 'next/server';
import { eventBus } from '@/lib/event-bus';
import { requireAuth } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send an initial connected message
      controller.enqueue(encoder.encode('event: connected\ndata: {"status": "ok"}\n\n'));

      // Subscribe to all events
      const unsubscribe = eventBus.subscribe('*', (payload) => {
        try {
          const { event, data } = payload;
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error("Failed to enqueue SSE event", err);
        }
      });

      // Keep connection alive with a heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('event: ping\ndata: {"time": "' + new Date().toISOString() + '"}\n\n'));
        } catch (err) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Handle client disconnect
      return () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
      };
    },
    cancel() {
      // Client disconnected
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
