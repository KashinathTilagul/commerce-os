'use client'

import { useState } from 'react'
import { GlassPanel } from '@/components/ui/glass-system'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppSubscription } from '@/lib/cpu-websocket'
import { ChevronDown, ChevronRight, Folder, FolderOpen, Hash, MessageSquare, Bot } from 'lucide-react'

interface GroupChannel {
  name: string
  items: { id: string; label: string; type: 'channel' | 'bot' }[]
}

const CHAT_GROUPS: GroupChannel[] = [
  {
    name: 'Company',
    items: [
      { id: 'Company', label: 'company-wide', type: 'channel' },
      { id: 'Announcements', label: 'announcements', type: 'channel' },
    ],
  },
  {
    name: 'Leadership',
    items: [
      { id: 'CEO', label: 'Krishna (CEO)', type: 'bot' },
      { id: 'CFO', label: 'Dhruv (CFO)', type: 'bot' },
    ],
  },
  {
    name: 'Marketing',
    items: [
      { id: 'Marketing', label: 'marketing-team', type: 'channel' },
      { id: 'CMO', label: 'Mira (CMO)', type: 'bot' },
    ],
  },
  {
    name: 'Operations',
    items: [
      { id: 'Operations', label: 'operations-team', type: 'channel' },
      { id: 'COO', label: 'Kael (COO)', type: 'bot' },
    ],
  },
  {
    name: 'Technology',
    items: [
      { id: 'Technology', label: 'tech-team', type: 'channel' },
      { id: 'CTO', label: 'Vega (CTO)', type: 'bot' },
    ],
  },
  {
    name: 'Creative',
    items: [
      { id: 'Creative', label: 'creative-team', type: 'channel' },
      { id: 'CCO', label: 'Zara (CCO)', type: 'bot' },
    ],
  },
  {
    name: 'Finance',
    items: [
      { id: 'Finance', label: 'finance-team', type: 'channel' },
    ],
  },
]

export function Chat() {
  const [activeChannel, setActiveChannel] = useState('Company')
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Company: true,
    Leadership: true,
    Marketing: true,
    Operations: true,
    Technology: false,
    Creative: false,
    Finance: false,
  })

  const queryClient = useQueryClient()
  useAppSubscription('chat')

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', activeChannel, activeThread],
    queryFn: async () => {
      const url = activeThread
        ? `/api/chat/channels/${activeChannel}/messages?threadId=${activeThread}`
        : `/api/chat/channels/${activeChannel}/messages`
      const res = await fetch(url)
      return res.json().then((r) => r.messages || [])
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

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar */}
      <GlassPanel level={1} className="w-60 border-r border-white/10 p-3 space-y-3 overflow-y-auto rounded-none">
        <div className="px-2 pt-1 pb-2 border-b border-white/[0.06]">
          <h2 className="font-display text-[12px] tracking-[0.16em] uppercase text-foreground/90 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            AI Workspace Chat
          </h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Groups & Nested Bots</p>
        </div>

        <div className="space-y-1">
          {CHAT_GROUPS.map((group) => {
            const isExpanded = expandedGroups[group.name] !== false

            return (
              <div key={group.name} className="space-y-0.5">
                {/* Group Name Header */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-cyan-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    )}
                    {isExpanded ? (
                      <FolderOpen className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span>{group.name}</span>
                  </div>

                  <span className="text-[9px] text-muted-foreground/50 bg-white/[0.04] px-1.5 py-0.2 rounded-full">
                    {group.items.length}
                  </span>
                </button>

                {/* Nested Bots & Channels under Group */}
                {isExpanded && (
                  <div className="ml-3 pl-2 border-l border-white/[0.06] space-y-0.5 py-0.5">
                    {group.items.map((item) => {
                      const isActive = activeChannel === item.id

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveChannel(item.id)
                            setActiveThread(null)
                          }}
                          className={`flex w-full items-center gap-2 rounded px-2.5 py-1 text-left text-[11px] transition-colors truncate ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-200 font-semibold'
                              : 'text-muted-foreground/80 hover:bg-white/[0.05] hover:text-foreground'
                          }`}
                        >
                          {item.type === 'bot' ? (
                            <Bot className={`h-3 w-3 shrink-0 ${isActive ? 'text-cyan-300' : 'text-purple-400/80'}`} />
                          ) : (
                            <Hash className={`h-3 w-3 shrink-0 ${isActive ? 'text-cyan-300' : 'text-muted-foreground/60'}`} />
                          )}
                          <span className="truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </GlassPanel>

      {/* Messages Pane */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-cyan-400" />
            <span className="font-display font-semibold text-sm text-foreground">{activeChannel}</span>
          </div>
        </div>

        <GlassPanel level={2} className="flex-1 p-5 overflow-auto space-y-3 rounded-none">
          {messages.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              No messages in #{activeChannel} yet. Start a conversation!
            </div>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                  {m.authorType?.[0] || 'A'}
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {m.authorType} • {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-foreground">{m.content}</div>
                  {!m.parentMessageId && (
                    <button onClick={() => setActiveThread(m.id)} className="text-[10px] text-cyan-400 mt-1 hover:underline">
                      # reply in thread
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </GlassPanel>

        {/* Composer */}
        <div className="p-3 border-t border-white/10 flex gap-2 bg-black/20">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send.mutate()}
            placeholder={`Message #${activeChannel}...`}
            className="flex-1 bg-white/5 rounded-lg px-3.5 py-2 text-xs text-foreground outline-none focus:bg-white/[0.08] transition-colors border border-white/[0.06]"
          />
          <button
            onClick={() => send.mutate()}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-xs font-medium border border-cyan-500/30 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Thread Pane */}
      {activeThread && (
        <div className="w-80 border-l border-white/10 p-4 bg-black/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground">Thread</span>
            <button onClick={() => setActiveThread(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
