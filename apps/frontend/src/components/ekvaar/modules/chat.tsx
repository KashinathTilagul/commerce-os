'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppSubscription } from '@/lib/cpu-websocket'

const SEED_CHANNELS = ['Company', 'CEO', 'CMO', 'CFO', 'Creative', 'Marketing', 'Finance', 'Operations']

export function Chat() {
  const [activeChannel, setActiveChannel] = useState('Company')
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  useAppSubscription('chat')

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel, activeThread],
    queryFn: async () => {
      const url = activeThread
        ? `/api/chat/channels/${activeChannel}/messages?threadId=${activeThread}`
        : `/api/chat/channels/${activeChannel}/messages`
      const res = await fetch(url)
      return res.json().then(r => r.messages || [])
    },
  })

  const send = useMutation({
    mutationFn: async () => {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel,
          content: message,
          parentMessageId: activeThread,
        }),
      })
      setMessage('')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  })

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar */}
      <div className="w-56 border-r border-white/10 p-3 space-y-1">
        {SEED_CHANNELS.map(ch => (
          <div
            key={ch}
            onClick={() => { setActiveChannel(ch); setActiveThread(null) }}
            className={`px-3 py-1.5 rounded cursor-pointer ${activeChannel === ch ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            {ch}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        <GlassPanel level={2} className="flex-1 p-4 overflow-auto space-y-3">
          {messages.map((m: any) => (
            <div key={m.id} className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-white/20" />
              <div>
                <div className="text-[10px] text-white/50">{m.authorType} • {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div>{m.content}</div>
                {!m.parentMessageId && (
                  <button onClick={() => setActiveThread(m.id)} className="text-[10px] text-purple-400 mt-0.5"># thread</button>
                )}
              </div>
            </div>
          ))}
        </GlassPanel>

        {/* Composer */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send.mutate()}
            placeholder="Message..."
            className="flex-1 bg-white/5 rounded px-3 py-2 text-sm"
          />
          <button onClick={() => send.mutate()} className="px-4 bg-white/10 rounded">Send</button>
        </div>
      </div>

      {/* Thread Pane */}
      {activeThread && (
        <div className="w-80 border-l border-white/10 p-3">
          <div className="text-xs mb-2 text-white/50">Thread</div>
          <button onClick={() => setActiveThread(null)} className="text-[10px]">Close</button>
        </div>
      )}
    </div>
  )
}
