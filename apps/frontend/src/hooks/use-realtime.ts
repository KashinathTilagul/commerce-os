import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only connect if we want real-time features enabled
    if (process.env.NEXT_PUBLIC_REALTIME !== 'true') return;

    const eventSource = new EventSource('/api/realtime');

    eventSource.onopen = () => {
      console.log('Real-time connection established');
    };

    // Listen for integration updates
    eventSource.addEventListener('integration_updated', (event) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'connected') {
          toast.success(`Integration Connected`, {
            description: `${data.toolkit} is now successfully connected.`
          });
        }
      } catch (e) {
        // ignore
      }
    });

    // Listen for agent updates
    eventSource.addEventListener('agent_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    eventSource.addEventListener('tool_executed', (event) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      try {
        const data = JSON.parse(event.data);
        toast('Tool Executed', {
          description: `${data.agent} executed ${data.tool} via ${data.toolkit}`
        });
      } catch (e) {
        // ignore
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      // Simple backoff could be added here, but EventSource auto-reconnects by default
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
