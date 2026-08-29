import Link from 'next/link'
import { ArrowRight, Bot, BrainCircuit, Check, Database, FileCheck2, Fingerprint, GitBranch, Network, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react'
import { MarketingPage, OS_APP_URL, SIGNUP_URL } from '@/components/marketing/site-shell'
import { ProductShot } from '@/components/marketing/product-shot'

const capabilities = [
  { icon: Bot, title: 'AI workforce', body: 'Give each teammate a role, instructions, tools, memory and an accountable place in the organisation.', color: '#C0342C' },
  { icon: BrainCircuit, title: 'Company memory', body: 'Keep decisions, relationships, artifacts and prior work available to the people and agents who need them.', color: '#E91E63' },
  { icon: Workflow, title: 'Visible workflows', body: 'Create scheduled and event-driven workflows, inspect each run and pause execution when evidence is missing.', color: '#0047AB' },
  { icon: Network, title: 'Connected operations', body: 'Link communication, files, commerce, social, engineering and business systems to governed agents.', color: '#2E7D32' },
  { icon: ShieldCheck, title: 'Approval boundaries', body: 'Keep publishing, spending and other external actions behind explicit human review.', color: '#C0342C' },
  { icon: TerminalSquare, title: 'Traceable work', body: 'Follow inputs, model choices, tool calls, outputs, errors, costs and provider receipts on one timeline.', color: '#0047AB' },
]

const steps = [
  ['01', 'Create the organisation', 'Workspace data, credentials and memory are isolated to the organisation.'],
  ['02', 'Connect intelligence', 'Add a provider key, test it, then select only verified models for each job.'],
  ['03', 'Connect work', 'Use OAuth or organisation-owned credentials to connect apps and workflows.'],
  ['04', 'Assign outcomes', 'Give Krishna or a specialist agent a goal, workflow, schedule and approval policy.'],
  ['05', 'Review evidence', 'Inspect the output and its trace before approving an external action.'],
]

export default function LandingPage() {
  return (
    <MarketingPage>
      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div aria-hidden className="absolute left-[-16rem] top-10 h-[34rem] w-[34rem] rounded-full bg-[#C0342C]/14 blur-[150px]" />
          <div aria-hidden className="absolute right-[-18rem] top-52 h-[38rem] w-[38rem] rounded-full bg-[#0047AB]/14 blur-[170px]" />
          <div className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-24 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="max-w-5xl">
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45"><span className="h-px w-9 bg-[#C0342C]" />Operating system for the AI-native company</div>
              <h1 className="mt-8 text-balance text-[clamp(3.5rem,8.5vw,8rem)] font-semibold leading-[0.86] tracking-[-0.075em]">Your company,<span className="block text-white/34">finally in sync.</span></h1>
              <p className="mt-8 max-w-2xl text-balance text-base leading-7 text-white/55 sm:text-xl sm:leading-8">People, AI teammates, memory, workflows and connected apps operating in one workspace—with approval, evidence and ownership built in.</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href={SIGNUP_URL} className="inline-flex h-12 items-center justify-center gap-3 bg-white px-6 text-[13px] font-semibold text-black hover:bg-[#F2EEE6]">Create your workspace <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/docs/getting-started" className="inline-flex h-12 items-center justify-center gap-3 border border-white/16 px-6 text-[13px] font-medium text-white/70 hover:border-white/40 hover:text-white">Read the setup guide</Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[11px] text-white/38">
                {['Bring your own models', 'Organisation-isolated', 'Human approval gates', 'Self-hostable services'].map((item) => <span key={item} className="flex items-center gap-2"><Check className="h-3 w-3 text-[#2E7D32]" />{item}</span>)}
              </div>
            </div>
            <div className="mt-16"><ProductShot priority src="/site/os/command-center.png" alt="Ekvaar OS Command Center showing live operating metrics and founder actions" label="Command Center" note="A real Ekvaar OS screen: live operational state, founder actions and company metrics in one view." /></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-end">
            <div><div className="font-mono text-[10px] text-white/28">01</div><div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/42">The operating layer</div><h2 className="mt-6 text-balance text-[clamp(2.8rem,5vw,5rem)] font-semibold leading-[0.94] tracking-[-0.06em]">More than a chat window.</h2></div>
            <p className="max-w-xl text-base leading-7 text-white/46 lg:justify-self-end">Ekvaar turns intelligence into a working company system: named roles, persistent context, visible processes, connected tools and human control.</p>
          </div>
          <div className="mt-16 grid border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body, color }) => <article key={title} className="group min-h-64 border-b border-r border-white/10 p-8 transition-colors hover:bg-white/[0.025]"><Icon className="h-5 w-5" style={{ color }} /><h3 className="mt-14 text-lg font-medium tracking-[-0.025em]">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-white/43">{body}</p></article>)}
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#F2EEE6] text-black">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[.9fr_1.1fr]">
            <div className="px-5 py-20 sm:px-8 lg:border-r lg:border-black/10 lg:px-12 lg:py-28"><div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/38">02 · From setup to execution</div><h2 className="mt-6 text-balance text-[clamp(2.7rem,5vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.06em]">A system you can understand before you trust.</h2><p className="mt-7 max-w-lg text-base leading-7 text-black/55">Start with one connected model and one workflow. Expand autonomy only when the evidence is good.</p></div>
            <div className="px-5 py-14 sm:px-8 lg:px-12 lg:py-24">
              {steps.map(([number, title, body]) => <div key={number} className="grid grid-cols-[3.5rem_1fr] border-t border-black/12 py-6 last:border-b"><span className="font-mono text-[10px] text-black/35">{number}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-black/50">{body}</p></div></div>)}
              <Link href="/docs/getting-started" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">Open the full guide <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:px-12 lg:py-32">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">03 · Product proof</div><h2 className="mt-6 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">See the actual system.</h2><p className="mt-6 max-w-md text-sm leading-6 text-white/45">These are captured screens from the working Ekvaar OS—not illustrative dashboard artwork.</p><Link href="/product" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">Explore every workspace <ArrowRight className="h-4 w-4" /></Link></div>
          <ProductShot src="/site/os/ai-workforce.png" alt="Ekvaar OS AI Workforce workspace" label="AI Workforce" note="Roles, work requests, progress, ownership and evidence remain visible to the team." />
        </section>

        <section className="border-t border-white/10"><div className="mx-auto grid max-w-[1440px] gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {[[Fingerprint, 'Organisation boundary', 'Credentials, memory and agent state are scoped to one organisation.'], [Database, 'Evidence over claims', 'Missing receipts remain blocked instead of being reported as complete.'], [GitBranch, 'Full decision trail', 'Requests, plans, tools, approvals and results stay attached to work.'], [FileCheck2, 'Human authority', 'Sensitive actions wait for the appropriate person and approval policy.']].map(([Icon, title, body]) => { const ItemIcon = Icon as typeof Fingerprint; return <article key={String(title)} className="bg-black p-8 lg:min-h-64"><ItemIcon className="h-5 w-5 text-white/44" /><h3 className="mt-12 text-base font-medium">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-white/40">{String(body)}</p></article> })}
        </div></section>

        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="relative overflow-hidden border border-white/12 bg-[#090909] px-7 py-16 sm:px-12 lg:px-16 lg:py-20"><div aria-hidden className="absolute inset-y-0 right-0 w-2/5 bg-[linear-gradient(135deg,transparent,rgba(192,52,44,.12),rgba(0,71,171,.12))]" /><div className="relative flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end"><div><div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">Enter the system</div><h2 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">Build a company that remembers, coordinates and delivers.</h2></div><Link href={OS_APP_URL} className="inline-flex h-12 shrink-0 items-center gap-3 bg-white px-6 text-[13px] font-semibold text-black hover:bg-[#F2EEE6]">Open Ekvaar OS <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>
    </MarketingPage>
  )
}
