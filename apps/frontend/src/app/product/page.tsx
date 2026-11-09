import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Eye, GitBranch, ShieldCheck, Users } from 'lucide-react'
import { MarketingPage, PageIntro, SIGNUP_URL } from '@/components/marketing/site-shell'
import { ProductShot } from '@/components/marketing/product-shot'

export const metadata: Metadata = { title: 'Product — Commerce OS', description: 'Explore the real workspaces inside Commerce OS.' }

const workspaces = [
  { src: '/site/os/command-center.webp', label: 'Command Center', alt: 'Commerce OS Command Center', note: 'A founder-level view of company health, work in progress and decisions that need attention.' },
  { src: '/site/os/ai-workforce.webp', label: 'AI Workforce', alt: 'Commerce OS AI Workforce', note: 'Organise agents by role, responsibility and reporting line; assign work and inspect progress.' },
  { src: '/site/os/content-studio.webp', label: 'Content Studio', alt: 'Commerce OS Content Studio', note: 'Create, review, approve and schedule marketing content without separating the output from its evidence.' },
  { src: '/site/os/memory-explorer.webp', label: 'Memory Explorer', alt: 'Commerce OS Memory Explorer', note: 'Inspect the entities, events and relationships retained from work across the organisation.' },
  { src: '/site/os/integrations.webp', label: 'Integrations', alt: 'Commerce OS Integrations', note: 'Connect organisation-owned accounts and make selected tools available to agents and workflows.' },
]

export default function ProductPage() {
  return (
    <MarketingPage>
      <main>
        <PageIntro eyebrow="Product" title="One system for the work behind the work." body="Commerce OS gives founders and teams a coherent place to coordinate people, AI, memory, tools, workflows and approvals." />
        <section className="mx-auto grid max-w-[1440px] gap-px border-x border-b border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {[
            [Users, 'Named ownership', 'Every task has an accountable agent, team or human owner.'],
            [GitBranch, 'Dependency-aware work', 'Plans show what must happen first and what is blocked.'],
            [Eye, 'Observable execution', 'Inputs, actions, outputs and errors stay visible on the task.'],
            [ShieldCheck, 'Approval governed', 'External changes wait behind the policies you define.'],
          ].map(([Icon, title, body]) => { const ItemIcon = Icon as typeof Users; return <article key={String(title)} className="min-h-56 bg-black p-8"><ItemIcon className="h-5 w-5 text-[#63D7E8]" /><h2 className="mt-12 font-medium">{String(title)}</h2><p className="mt-3 text-sm leading-6 text-white/40">{String(body)}</p></article> })}
        </section>
        <section className="mx-auto max-w-[1440px] space-y-24 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          {workspaces.map((workspace, index) => <div key={workspace.label} className={`grid gap-10 lg:grid-cols-[.34fr_.66fr] lg:items-start ${index % 2 ? 'lg:grid-cols-[.66fr_.34fr]' : ''}`}>
            {index % 2 === 1 && <div className="lg:order-1"><ProductShot {...workspace} /></div>}
            <div className={index % 2 ? 'lg:order-2' : ''}><div className="font-mono text-[10px] text-white/28">{String(index + 1).padStart(2, '0')}</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{workspace.label}</h2><p className="mt-5 max-w-md text-sm leading-7 text-white/45">{workspace.note}</p><div className="mt-7 space-y-3 text-xs text-white/55">{['Real organisation state', 'Task-linked history', 'Permission-aware actions'].map((item) => <div key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#2E7D32]" />{item}</div>)}</div></div>
            {index % 2 === 0 && <ProductShot {...workspace} />}
          </div>)}
        </section>
        <section className="border-t border-white/10 bg-[#F2EEE6] text-black"><div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:px-12"><div><div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">Start with one team</div><h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Connect what you use. Govern what agents can do.</h2></div><Link href={SIGNUP_URL} className="inline-flex h-12 shrink-0 items-center gap-3 bg-black px-6 text-sm font-semibold text-white">Create workspace <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </MarketingPage>
  )
}
