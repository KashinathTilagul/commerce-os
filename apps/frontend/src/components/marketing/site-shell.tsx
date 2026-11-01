import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://commerce.abata.tech'
export const OS_APP_URL = process.env.NEXT_PUBLIC_OS_APP_URL || `${SITE_ORIGIN}/app`
export const LOGIN_URL = `${SITE_ORIGIN}/login`
export const SIGNUP_URL = `${SITE_ORIGIN}/signup`

const links = [
  { href: '/product', label: 'Product' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/docs', label: 'Documentation' },
  { href: '/security', label: 'Security' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/88 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Primary navigation">
        <Link href="/" className="group flex items-center gap-3" aria-label="Commerce OS home">
          <span className="grid h-8 w-8 place-items-center border border-white/20 bg-white text-[11px] font-black tracking-[-0.08em] text-black transition-transform group-hover:rotate-3">C</span>
          <span className="text-[13px] font-semibold tracking-[0.24em]">COMMERCE <span className="text-white/45">OS</span></span>
        </Link>
        <div className="hidden items-center gap-7 text-[12px] text-white/55 md:flex">
          {links.map((link) => <Link key={link.href} className="transition-colors hover:text-white" href={link.href}>{link.label}</Link>)}
        </div>
        <div className="flex items-center gap-2">
          <Link href={LOGIN_URL} className="hidden h-9 items-center px-3 text-[12px] text-white/55 transition-colors hover:text-white sm:inline-flex">Sign in</Link>
          <Link href={OS_APP_URL} className="inline-flex h-9 items-center gap-2 border border-white/20 px-4 text-[12px] font-medium transition-colors hover:border-white hover:bg-white hover:text-black">
            Enter workspace <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 text-[12px] text-white/42 sm:px-8 md:grid-cols-[1fr_auto_auto] lg:px-12">
        <div>
          <div className="font-semibold tracking-[0.2em] text-white">COMMERCE OS</div>
          <p className="mt-3 max-w-sm leading-6">An accountable operating system for people, AI teammates, company memory and connected work.</p>
        </div>
        <div className="grid gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Explore</span>
          {links.map((link) => <Link key={link.href} className="hover:text-white" href={link.href}>{link.label}</Link>)}
        </div>
        <div className="grid content-start gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Start</span>
          <Link className="hover:text-white" href={SIGNUP_URL}>Create workspace</Link>
          <Link className="hover:text-white" href={LOGIN_URL}>Sign in</Link>
          <Link className="hover:text-white" href="https://abata.tech">ABATA</Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-[10px] text-white/25">© {new Date().getFullYear()} ABATA · India · IST</div>
    </footer>
  )
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black text-white selection:bg-[#C0342C] selection:text-white"><SiteHeader />{children}<SiteFooter /></div>
}

export function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="border-b border-white/10">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#63D7E8]">{eyebrow}</div>
        <h1 className="mt-6 max-w-5xl text-balance text-[clamp(3.2rem,7vw,6.8rem)] font-semibold leading-[0.9] tracking-[-0.065em]">{title}</h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">{body}</p>
      </div>
    </div>
  )
}
