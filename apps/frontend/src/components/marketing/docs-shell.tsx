import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const docsNavigation = [
  { href: '/docs', label: 'Documentation home' },
  { href: '/docs/getting-started', label: 'Getting started' },
  { href: '/docs/integrations', label: 'Connect integrations' },
  { href: '/docs/workflows', label: 'Build workflows' },
  { href: '/docs/approvals-and-logs', label: 'Approvals and logs' },
  { href: '/docs/troubleshooting', label: 'Troubleshooting' },
]

export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-white/10 px-5 py-8 sm:px-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/28">Commerce OS docs</div>
        <nav className="mt-6 grid gap-1" aria-label="Documentation navigation">{docsNavigation.map((item) => <Link key={item.href} href={item.href} className="border-l border-white/10 px-4 py-2.5 text-xs text-white/46 transition-colors hover:border-white/50 hover:text-white">{item.label}</Link>)}</nav>
        <Link href="/app" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-white/75">Open workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
      </aside>
      <article className="min-w-0 px-5 py-14 sm:px-8 lg:px-14 lg:py-20 xl:px-20">{children}</article>
    </div>
  )
}

export function DocIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <header className="max-w-4xl border-b border-white/10 pb-12"><div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#63D7E8]">{eyebrow}</div><h1 className="mt-5 text-balance text-4xl font-semibold leading-[.98] tracking-[-0.055em] sm:text-6xl">{title}</h1><p className="mt-6 max-w-3xl text-base leading-8 text-white/50">{body}</p></header>
}

export function DocSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="max-w-4xl border-b border-white/10 py-12 last:border-b-0"><h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h2><div className="mt-6 space-y-5 text-sm leading-7 text-white/52">{children}</div></section>
}

export function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div className="grid gap-4 border-t border-white/10 py-6 sm:grid-cols-[3rem_1fr]"><span className="font-mono text-[10px] text-white/28">{number}</span><div><h3 className="font-medium text-white">{title}</h3><div className="mt-2 text-sm leading-7 text-white/48">{children}</div></div></div>
}

export function Callout({ title, children, tone = 'info' }: { title: string; children: React.ReactNode; tone?: 'info' | 'warn' | 'good' }) {
  const colors = tone === 'warn' ? 'border-[#C0342C]/45 bg-[#C0342C]/8' : tone === 'good' ? 'border-[#2E7D32]/45 bg-[#2E7D32]/8' : 'border-[#0047AB]/45 bg-[#0047AB]/8'
  return <div className={`border p-5 ${colors}`}><div className="text-xs font-semibold text-white">{title}</div><div className="mt-2 text-sm leading-6 text-white/48">{children}</div></div>
}
