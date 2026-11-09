import Link from 'next/link'
import { ProductShot } from '@/components/marketing/product-shot'
import { DEMO_URL, MarketingPage, SIGNUP_URL } from '@/components/marketing/site-shell'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F3EDE4]'

const modules = [
  ['Command Center', 'A founder view of company health, work in progress, and decisions waiting on you.'],
  ['Workforce', 'Agents organised by role and reporting line. Assign work and inspect progress.'],
  ['Sales & Orders', 'Omnichannel orders in the same desktop as the rest of the company.'],
  ['Inventory & Ops', 'Stock and supply work next to the orders that consume it.'],
  ['Finance', 'P&L and cash in a window, not a separate login.'],
  ['Campaigns', 'Marketing work with an owner, a timeline, and an approval step.'],
  ['Product Launches', 'Research through publish, with a person signing off each stage.'],
  ['Content Studio', 'Draft, review, approve, and schedule content with the evidence attached.'],
  ['Customers', 'Buyer records in the same organisation as orders and campaigns.'],
  ['Brand Intelligence', 'Brand checks beside the work that needs them.'],
  ['Memory Explorer', 'Entities, events, and relationships retained from work across the organisation.'],
  ['Integrations', 'Organisation-owned connections. A connection is not permission to act.'],
]

const steps = [
  ['01', 'Create the workspace', 'Sign up, name the organisation, and finish onboarding. That organisation is the boundary for settings, credentials, memory, and work.'],
  ['02', 'Open the desktop', 'Modules open as windows: command, sales, inventory, finance, campaigns, launches, and the workforce.'],
  ['03', 'Connect your own accounts', 'Shopify, WooCommerce, Razorpay, n8n, and other adapters stay on the organisation that configured them. Nothing is inherited from another workspace.'],
  ['04', 'Draft, then approve', 'Agents can prepare work. Publishing, payments, messages, and other external changes wait for a named approver and a provider receipt.'],
]

const integrations = ['Shopify', 'WooCommerce', 'Razorpay', 'Stripe', 'n8n', 'Gmail', 'Slack', 'Google Calendar', 'Meta', 'LinkedIn', 'Composio', 'Supabase']

const tiers = [
  {
    name: 'Private beta',
    price: 'Start free',
    body: 'A workspace for one organisation. The signup form is the real account flow.',
    points: ['Organisation and onboarding', 'Desktop modules in the product', 'Organisation-owned credentials', 'Approval queue for sensitive actions'],
    href: SIGNUP_URL,
    cta: 'Start free',
  },
  {
    name: 'Team',
    price: 'Indicative',
    body: 'For a team running agents against live tools. Not billed in the app today.',
    points: ['Everything in private beta', 'More people in the organisation', 'Workflows and scheduled jobs', 'Scoped with you before any invoice'],
    href: DEMO_URL,
    cta: 'Book a demo',
  },
  {
    name: 'Enterprise',
    price: 'Indicative',
    body: 'For multi-organisation control, SSO, and a tighter operating agreement. Not billed in the app today.',
    points: ['Organisation isolation', 'SSO and role boundaries where configured', 'Audit trail of actions and receipts', 'A conversation, not a checkout'],
    href: DEMO_URL,
    cta: 'Book a demo',
  },
]

const faqs = [
  ['What is Commerce OS?', 'A web desktop for a commerce company. People, AI teammates, orders, inventory, finance, campaigns, and connected apps share one organisation.'],
  ['Does signing up need a database?', 'Yes. Creating an account writes the organisation to PostgreSQL. The marketing pages do not. If signup fails, the production database is still being connected.'],
  ['Can an agent publish or spend on its own?', 'Not by default. External and sensitive actions can be held for a named approver. Missing credentials, media, or evidence keeps the operation blocked.'],
  ['Which tools can I connect?', 'The product includes adapters and toolkit entries for commerce, mail, chat, ads, and automation, including Shopify, WooCommerce, Razorpay, n8n, and Composio. A listed service is connected only after your organisation configures it.'],
  ['Is the source public?', 'No. Commerce OS is in private beta. Use the product from this site. There is no public source link.'],
  ['Are the prices live?', 'No. The tiers describe packaging. The app does not charge a card. Private beta signup is the only self-serve path.'],
]

export function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Commerce OS',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'A desktop where commerce operations and an AI workforce share one organisation, with human approval for consequential actions.',
    url: 'https://commerce.abata.tech/',
    publisher: { '@type': 'Organization', name: 'ABATA', url: 'https://abata.tech' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Private beta workspace. Other tiers are indicative and are not billed in the product.',
    },
  }

  return (
    <MarketingPage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="relative overflow-hidden">
          <div className="os-drift pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#C8302A]/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-[#1F3A5F]/50 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Private beta · ABATA</p>
            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              The operating system for a commerce company.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#D5CFC6] sm:text-lg">
              One desktop where orders, inventory, finance, campaigns, and an AI workforce share the same organisation. Consequential actions wait for a person.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={SIGNUP_URL} className={`inline-flex h-12 items-center justify-center rounded-full bg-[#F3EDE4] px-6 text-sm font-semibold text-[#12110F] hover:bg-white ${focus}`}>Start free</Link>
              <Link href="#desktop" className={`inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-[#F3EDE4] hover:bg-white/6 ${focus}`}>See it in action</Link>
              <Link href={DEMO_URL} className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[#D5CFC6] hover:text-white ${focus}`}>Book a demo</Link>
            </div>
            <p className="mt-4 text-sm text-[#C9C3B8]">No card. Signup creates your organisation. A new database is being connected for accounts.</p>
          </div>
        </section>

        <section id="desktop" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6" aria-labelledby="preview-title">
          <h2 id="preview-title" className="sr-only">Product preview</h2>
          <div className="rounded-3xl border border-white/12 bg-white/[0.03] p-2 shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-sm sm:p-3">
            <ProductShot priority src="/site/os/ai-workforce.webp" alt="Commerce OS workforce window with agents, approvals, and an assign-work field" label="Workforce" note="A real screen from the product. Counts on it come from that workspace, not from this page." />
          </div>
        </section>

        <section id="modules" className="scroll-mt-20 border-t border-white/10" aria-labelledby="modules-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Modules</p>
            <h2 id="modules-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">The windows the desktop actually opens.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D5CFC6]">Names below match the apps registered in the product. Utilities such as the calculator and Spotify are in the desktop too; they are not the product story.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(([name, body]) => (
                <article key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-base font-semibold">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#D5CFC6]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-t border-white/10" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">How it works</p>
            <h2 id="how-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Organisation first. Autonomy last.</h2>
            <ol className="mt-10 grid gap-4 lg:grid-cols-4">
              {steps.map(([n, title, body]) => (
                <li key={n} className="rounded-2xl border border-white/10 bg-[#0c0e14] p-5">
                  <span className="font-mono text-xs text-[#E7B2A4]">{n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#D5CFC6]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-white/10" aria-labelledby="screens-title">
          <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 lg:py-24">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Inside the product</p>
              <h2 id="screens-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Screens from the running app.</h2>
            </div>
            <ProductShot src="/site/os/content-studio.webp" alt="Commerce OS Content Studio with a post ready to approve" label="Content Studio" note="Draft, review, approve, and schedule without splitting the output from its evidence." />
            <ProductShot src="/site/os/integrations.webp" alt="Commerce OS integrations workspace" label="Integrations" note="Connections belong to the organisation. A connection is not permission to act." />
            <Link href="/product" className={`inline-flex text-sm font-semibold text-[#F3EDE4] underline decoration-white/30 underline-offset-4 hover:decoration-white ${focus}`}>More screens on the product page</Link>
          </div>
        </section>

        <section id="integrations" className="scroll-mt-20 border-t border-white/10" aria-labelledby="integrations-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Integrations</p>
            <h2 id="integrations-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Connect what your company already runs.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D5CFC6]">These names are adapters or toolkit entries in the codebase. Listing one does not mean it is connected. Each organisation configures and verifies its own.</p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {integrations.map((name) => (
                <li key={name} className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-[#E7E1D6]">{name}</li>
              ))}
            </ul>
            <Link href="/integrations" className={`mt-8 inline-flex text-sm font-semibold text-[#F3EDE4] underline decoration-white/30 underline-offset-4 hover:decoration-white ${focus}`}>See how connections and approvals differ</Link>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-t border-white/10" aria-labelledby="pricing-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Pricing</p>
            <h2 id="pricing-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Indicative packaging. Not a checkout.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D5CFC6]">Nothing here is a bill. Private beta signup is free and opens the real account form. Team and Enterprise describe how a workspace can grow. They are not charged in the app.</p>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {tiers.map((tier) => (
                <article key={tier.name} className="flex flex-col rounded-3xl border border-white/12 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                    <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#E7B2A4]">{tier.price}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#D5CFC6]">{tier.body}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm text-[#E7E1D6]">
                    {tier.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  <Link href={tier.href} className={`mt-8 inline-flex h-11 items-center justify-center rounded-full bg-[#F3EDE4] text-sm font-semibold text-[#12110F] hover:bg-white ${focus}`}>{tier.cta}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-20 border-t border-white/10" aria-labelledby="security-title">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-24">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Security</p>
              <h2 id="security-title" className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Autonomy with a boundary.</h2>
              <p className="mt-4 text-sm leading-7 text-[#D5CFC6]">The product is built around organisation scope, credentials that belong to that organisation, and a trail of what an agent did.</p>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-[#E7E1D6]">
              <li className="rounded-2xl border border-white/10 p-4">Users, credentials, settings, memories, and records stay on an organisation boundary.</li>
              <li className="rounded-2xl border border-white/10 p-4">A new organisation does not inherit another workspace’s provider keys.</li>
              <li className="rounded-2xl border border-white/10 p-4">Sensitive external actions can wait for a named approver.</li>
              <li className="rounded-2xl border border-white/10 p-4">If credentials, media, or evidence are missing, the operation stays blocked.</li>
            </ul>
            <Link href="/security" className={`text-sm font-semibold text-[#F3EDE4] underline decoration-white/30 underline-offset-4 hover:decoration-white lg:col-span-2 ${focus}`}>Security and control</Link>
          </div>
        </section>

        <section className="border-t border-white/10" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 id="faq-title" className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Questions</h2>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {faqs.map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className={`cursor-pointer list-none text-base font-semibold text-[#F3EDE4] [&::-webkit-details-marker]:hidden ${focus}`}>{q}</summary>
                  <p className="mt-3 text-sm leading-7 text-[#D5CFC6]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Open a workspace.</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[#D5CFC6]">Signup is the product’s account flow. A demo request opens your email app and is not stored here.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={SIGNUP_URL} className={`inline-flex h-12 items-center justify-center rounded-full bg-[#F3EDE4] px-6 text-sm font-semibold text-[#12110F] hover:bg-white ${focus}`}>Start free</Link>
              <Link href={DEMO_URL} className={`inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold ${focus}`}>Book a demo</Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingPage>
  )
}
