import Link from 'next/link'

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://app.commerce.abata.tech'
export const LOGIN_URL = '/login'
export const SIGNUP_URL = '/signup'
export const DEMO_URL = '/demo'
export const OS_APP_URL = '/app'

const links = [
  { href: '/#modules', label: 'Product' },
  { href: '/#how', label: 'How it works' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
  { href: '/docs', label: 'Docs' },
]

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EDE4]'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Primary">
        <Link href="/" className={`flex items-center gap-2.5 ${focus}`} aria-label="Commerce OS home">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white text-[11px] font-black tracking-[-0.06em] text-[#12110F]">C</span>
          <span className="text-[13px] font-semibold tracking-[0.18em] text-[#F3EDE4]">COMMERCE OS</span>
        </Link>
        <div className="hidden items-center gap-6 text-[13px] text-[#D5CFC6] lg:flex">
          {links.map((link) => (
            <Link key={link.href} className={`transition-colors hover:text-white ${focus}`} href={link.href}>{link.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href={LOGIN_URL} className={`hidden h-9 items-center px-3 text-[13px] text-[#D5CFC6] hover:text-white sm:inline-flex ${focus}`}>Sign in</Link>
          <Link href={SIGNUP_URL} className={`inline-flex h-9 items-center rounded-full bg-[#F3EDE4] px-4 text-[13px] font-semibold text-[#12110F] hover:bg-white ${focus}`}>Start free</Link>
          <details className="relative lg:hidden">
            <summary className={`grid h-9 cursor-pointer list-none place-items-center rounded-full border border-white/15 px-3 text-[13px] text-[#F3EDE4] [&::-webkit-details-marker]:hidden ${focus}`}>Menu</summary>
            <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/12 bg-[#101218] p-2 shadow-2xl">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={`block rounded-xl px-3 py-2.5 text-sm text-[#E7E1D6] hover:bg-white/6 ${focus}`}>{link.label}</Link>
              ))}
              <Link href={LOGIN_URL} className={`block rounded-xl px-3 py-2.5 text-sm text-[#E7E1D6] hover:bg-white/6 ${focus}`}>Sign in</Link>
              <Link href={DEMO_URL} className={`block rounded-xl px-3 py-2.5 text-sm text-[#E7E1D6] hover:bg-white/6 ${focus}`}>Book a demo</Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#07080c]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="text-sm font-semibold tracking-[0.16em] text-[#F3EDE4]">COMMERCE OS</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#C9C3B8]">A desktop for commerce teams. Orders, inventory, finance, campaigns and an AI workforce share one organisation.</p>
        </div>
        <nav className="grid content-start gap-2 text-sm" aria-label="Explore">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A89F93]">Explore</span>
          {links.map((link) => <Link key={link.href} className={`text-[#D5CFC6] hover:text-white ${focus}`} href={link.href}>{link.label}</Link>)}
        </nav>
        <nav className="grid content-start gap-2 text-sm" aria-label="Account and legal">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A89F93]">Account</span>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href={SIGNUP_URL}>Start free</Link>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href={LOGIN_URL}>Sign in</Link>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href={DEMO_URL}>Book a demo</Link>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href="/privacy">Privacy</Link>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href="/terms">Terms</Link>
          <Link className={`text-[#D5CFC6] hover:text-white ${focus}`} href="https://abata.tech">ABATA</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-[#A89F93]">© {new Date().getFullYear()} ABATA · Commerce OS</div>
    </footer>
  )
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07080c] text-[#F3EDE4] selection:bg-[#C8302A] selection:text-white">
      <a href="#content" className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#F3EDE4] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#12110F] ${focus}`}>Skip to content</a>
      <SiteHeader />
      <div id="content">{children}</div>
      <SiteFooter />
    </div>
  )
}

export function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-[#D5CFC6] sm:text-lg">{body}</p>
      </div>
    </div>
  )
}
