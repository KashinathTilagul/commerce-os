'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldAlert, Sparkles, CheckCircle2, XCircle, HelpCircle, Sliders,
  TrendingUp, Package, Megaphone, DollarSign, Activity, ArrowRight, Brain
} from 'lucide-react'
import { ExecutiveIntelligenceEngine, DecisionItem } from '@/lib/executive-intelligence'

export function ExecutiveBriefModule() {
  const [decisions, setDecisions] = useState<DecisionItem[]>(() => 
    ExecutiveIntelligenceEngine.getPendingApprovals('default_org')
  )
  const [activeAskId, setActiveAskId] = useState<string | null>(null)
  const [krishnaQuery, setKrishnaQuery] = useState('')
  const [krishnaReplies, setKrishnaReplies] = useState<Record<string, string>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleDecision = (id: string, action: 'APPROVE' | 'REJECT') => {
    const dec = decisions.find(d => d.id === id)
    setDecisions(prev => prev.filter(d => d.id !== id))
    showToast(action === 'APPROVE' ? `Approved: ${dec?.actionTitle}` : `Rejected: ${dec?.actionTitle}`)
  }

  const handleAskKrishna = (id: string) => {
    if (!krishnaQuery.trim()) return
    setKrishnaReplies(prev => ({
      ...prev,
      [id]: `Krishna (Chief of Staff): I evaluated historical sales velocity and vendor lead times. Restocking 250 units maximizes gross margin while keeping holding costs under 4%.`
    }))
    setKrishnaQuery('')
  }

  const healthMetrics = [
    { label: 'Revenue', status: 'GREEN', trend: '↑ +12% this week', icon: TrendingUp, color: '#4CAF50' },
    { label: 'Inventory', status: 'YELLOW', trend: '2 items low stock', icon: Package, color: '#FFB300' },
    { label: 'Marketing', status: 'RED', trend: 'ROAS dropped 18%', icon: Megaphone, color: '#E53935' },
    { label: 'Cash Flow', status: 'GREEN', trend: 'Positive (+₹1.2L)', icon: DollarSign, color: '#4CAF50' },
    { label: 'Operations', status: 'GREEN', trend: 'All syncs active', icon: Activity, color: '#4CAF50' },
  ]

  const attentionItems = ExecutiveIntelligenceEngine.getNeedsAttentionItems('default_org')

  return (
    <div className="h-full w-full material-layer-4 text-[#F5F1EA] p-6 overflow-y-auto font-sans flex flex-col gap-6 selection:bg-[#C8302A] selection:text-white">
      {/* Toast Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-[#1A1A1A] border border-[#4CAF50] text-[#4CAF50] px-4 py-2 rounded-lg shadow-xl text-sm font-mono flex items-center gap-2 z-50"
          >
            <CheckCircle2 size={16} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Chief of Staff Status */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Executive Brief</h1>
            <span className="bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30 text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
              Krishna Active (Chief of Staff)
            </span>
          </div>
          <p className="text-xs text-white/50 font-mono mt-1">
            Organization State Analyzed • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono">
          <Brain size={16} className="text-[#D4859B]" />
          <span>Overall Health: <strong className="text-[#4CAF50]">GOOD</strong></span>
        </div>
      </div>

      {/* Business Health Matrix */}
      <div>
        <h2 className="text-xs uppercase font-mono text-white/40 tracking-wider mb-3">Business Health Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {healthMetrics.map(m => (
            <div key={m.label} className="bg-[#141414] border border-white/5 p-3 rounded-xl flex flex-col gap-2 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between">
                <m.icon size={16} style={{ color: m.color }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
              <div>
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="text-[11px] font-mono text-white/50 mt-0.5">{m.trend}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Layout: Needs Attention & Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Needs Attention Column (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-mono text-[#E53935] tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} /> Needs Attention ({attentionItems.length})
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {attentionItems.map(item => (
              <div key={item.id} className="bg-[#141414] border border-[#E53935]/20 hover:border-[#E53935]/50 p-4 rounded-xl flex flex-col gap-2.5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#E53935]/10 text-[#E53935] border border-[#E53935]/30">
                    {item.severity}
                  </span>
                  <span className="text-xs font-mono text-[#E53935]">{item.impact}</span>
                </div>

                <h3 className="text-sm font-semibold">{item.title}</h3>
                
                <div className="bg-[#0A0A0A] p-2.5 rounded-lg border border-white/5 text-xs text-white/70 font-mono leading-relaxed">
                  <strong className="text-white/40 block mb-1">EVIDENCE:</strong>
                  {item.evidence}
                </div>

                <div className="text-xs text-[#4CAF50] font-mono flex items-center gap-1">
                  <ArrowRight size={12} /> {item.recommendedAction}
                </div>
              </div>
            ))}
          </div>

          {/* Today's Mission Card */}
          <div className="bg-gradient-to-br from-[#1A1F2C] to-[#141414] border border-[#1F3A5F] p-4 rounded-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-[#4FB0F5]">
              <span>TODAY'S MISSION</span>
              <span>Target: +₹18,000</span>
            </div>
            <h3 className="text-base font-bold">Launch Black Oversized Tee Restock & Reallocate Meta Spend</h3>
            <ul className="text-xs text-white/70 font-mono space-y-1 list-disc list-inside">
              <li>Approve PO #1042 for inventory replenishment</li>
              <li>Reallocate ₹24k Meta budget to high-performing Reel ad sets</li>
              <li>Deploy VIP customer sequence on Instagram</li>
            </ul>
          </div>
        </div>

        {/* AI Approvals Column (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-mono text-[#D4859B] tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} /> Krishna Decision Approvals ({decisions.length})
            </h2>
            <span className="text-xs font-mono text-white/40">4-Way Action Engine</span>
          </div>

          {decisions.length === 0 ? (
            <div className="bg-[#141414] border border-white/5 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 size={32} className="text-[#4CAF50]" />
              <div className="text-sm font-semibold">All Decisions Addressed</div>
              <div className="text-xs text-white/40 font-mono">Krishna is monitoring background execution logs.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {decisions.map(dec => (
                <div key={dec.id} className="bg-[#141414] border border-white/10 hover:border-white/20 p-4 rounded-xl flex flex-col gap-3 transition-all">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#D4859B]/10 text-[#D4859B] border border-[#D4859B]/30">
                        {dec.agentName}
                      </span>
                      <span className="text-xs font-mono text-white/40">Confidence: {dec.confidenceScore}%</span>
                    </div>
                    <span className="text-xs font-mono text-[#4CAF50]">{dec.impact}</span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-semibold">{dec.actionTitle}</h3>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">{dec.description}</p>
                  </div>

                  {/* Krishna Reply Box if Ask AI used */}
                  {krishnaReplies[dec.id] && (
                    <div className="bg-[#1A1F2C] border border-[#1F3A5F] p-3 rounded-lg text-xs font-mono text-[#4FB0F5] leading-relaxed">
                      {krishnaReplies[dec.id]}
                    </div>
                  )}

                  {/* Ask Krishna Form */}
                  {activeAskId === dec.id && (
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="text" 
                        placeholder="Ask Krishna why this is recommended..."
                        value={krishnaQuery}
                        onChange={e => setKrishnaQuery(e.target.value)}
                        className="bg-[#0A0A0A] border border-white/20 rounded px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-[#D4859B] font-mono"
                      />
                      <button 
                        onClick={() => handleAskKrishna(dec.id)}
                        className="bg-[#D4859B] text-black px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#d4859b]/80 font-mono"
                      >
                        Ask
                      </button>
                    </div>
                  )}

                  {/* 4-Way Decision Action Buttons */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDecision(dec.id, 'APPROVE')}
                        className="bg-[#4CAF50] text-black font-semibold text-xs px-3.5 py-1.5 rounded-lg hover:bg-[#4CAF50]/90 transition-colors flex items-center gap-1 font-mono"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>

                      <button 
                        onClick={() => showToast(`Modify opened for ${dec.actionTitle}`)}
                        className="bg-[#1A1A1A] border border-white/20 text-white font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 font-mono"
                      >
                        <Sliders size={13} /> Modify
                      </button>

                      <button 
                        onClick={() => setActiveAskId(activeAskId === dec.id ? null : dec.id)}
                        className="bg-[#1A1A1A] border border-[#D4859B]/40 text-[#D4859B] font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-[#D4859B]/10 transition-colors flex items-center gap-1 font-mono"
                      >
                        <HelpCircle size={13} /> Ask Krishna
                      </button>
                    </div>

                    <button 
                      onClick={() => handleDecision(dec.id, 'REJECT')}
                      className="text-white/40 hover:text-[#E53935] text-xs font-mono transition-colors flex items-center gap-1"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
