import type { Metadata } from 'next'
import { Database, Eye, KeyRound, LockKeyhole, ShieldCheck, UserCheck } from 'lucide-react'
import { MarketingPage, PageIntro } from '@/components/marketing/site-shell'

export const metadata: Metadata = { title: 'Security and control — Commerce OS', description: 'How Commerce OS handles organisation boundaries, credentials, approvals and evidence.' }

export default function SecurityPage() {
  const principles = [
    [LockKeyhole, 'Organisation isolation', 'Users, credentials, settings, memories and operational records are associated with an organisation boundary.'],
    [KeyRound, 'Owned credentials', 'API keys and OAuth connections belong to the organisation that configured them; new organisations do not inherit another workspace\'s provider access.'],
    [UserCheck, 'Human approval', 'External and sensitive actions can be held for a named approver before execution.'],
    [Eye, 'Observable actions', 'Work timelines retain the request, agent, tool activity, state transitions and resulting artifacts.'],
    [Database, 'Evidence-backed completion', 'Provider receipts and artifact references are retained where an external action needs proof.'],
    [ShieldCheck, 'Fail closed', 'If required credentials, media, permissions or evidence are missing, the operation remains blocked.'],
  ]
  return <MarketingPage><main><PageIntro eyebrow="Security and control" title="Autonomy needs a boundary." body="Commerce OS is designed around organisation scope, explicit credentials, traceable work and human approval for consequential actions." /><section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="grid gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-3">{principles.map(([Icon, title, body]) => { const ItemIcon = Icon as typeof LockKeyhole; return <article key={String(title)} className="min-h-72 bg-black p-8"><ItemIcon className="h-5 w-5 text-[#63D7E8]" /><h2 className="mt-14 text-lg font-medium">{String(title)}</h2><p className="mt-4 text-sm leading-7 text-white/42">{String(body)}</p></article> })}</div><div className="mt-14 grid gap-8 border border-white/12 bg-[#080808] p-8 lg:grid-cols-2 lg:p-12"><div><div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Deployment note</div><h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Configuration determines the real boundary.</h2></div><p className="text-sm leading-7 text-white/46">Security also depends on correct database migrations, secret storage, network exposure, OAuth configuration and provider permissions in the deployed environment. The product should report missing configuration rather than silently falling back to shared access.</p></div></section></main></MarketingPage>
}
