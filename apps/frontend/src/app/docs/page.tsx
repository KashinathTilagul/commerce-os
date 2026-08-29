import Link from 'next/link'
import { ArrowRight, BookOpen, Cable, FileCheck2, LifeBuoy, Play, Workflow } from 'lucide-react'
import { DocIntro } from '@/components/marketing/docs-shell'

const guides = [
  { href: '/docs/getting-started', icon: Play, title: 'Getting started', body: 'Create an organisation, connect a model, invite the team and run the first controlled task.' },
  { href: '/docs/integrations', icon: Cable, title: 'Integrations', body: 'Understand OAuth, provider keys, Composio connections and direct service adapters.' },
  { href: '/docs/workflows', icon: Workflow, title: 'Workflows', body: 'Design n8n workflows, assign them to agents and define triggers, inputs, outputs and schedules.' },
  { href: '/docs/approvals-and-logs', icon: FileCheck2, title: 'Approvals and logs', body: 'Review artifacts, approve sensitive actions and inspect the complete execution timeline.' },
  { href: '/docs/troubleshooting', icon: LifeBuoy, title: 'Troubleshooting', body: 'Diagnose model, database, OAuth, media generation and workflow connection failures.' },
]

export default function DocsHome() {
  return <><DocIntro eyebrow="Documentation" title="Understand the system before you automate it." body="Practical guides for configuring Ekvaar OS, connecting the company’s services and operating agents with visible control." /><section className="py-12"><div className="grid gap-px bg-white/10 md:grid-cols-2">{guides.map(({ href, icon: Icon, title, body }) => <Link href={href} key={href} className="group bg-black p-7 hover:bg-white/[0.025]"><Icon className="h-5 w-5 text-[#63D7E8]" /><div className="mt-9 flex items-center justify-between"><h2 className="text-lg font-medium">{title}</h2><ArrowRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white" /></div><p className="mt-3 text-sm leading-6 text-white/42">{body}</p></Link>)}</div><div className="mt-10 flex items-start gap-4 border border-white/10 bg-[#080808] p-6"><BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#E91E63]" /><div><h2 className="font-medium">Start small</h2><p className="mt-2 text-sm leading-6 text-white/44">Connect one verified model and one low-risk workflow first. Confirm the logs and approval behavior before expanding agent permissions.</p></div></div></section></>
}
