import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, KeyRound, Network, ShieldCheck, Workflow } from 'lucide-react'
import { MarketingPage, PageIntro } from '@/components/marketing/site-shell'
import { ProductShot } from '@/components/marketing/product-shot'

export const metadata: Metadata = { title: 'Integrations — Ekvaar OS', description: 'Connect models, apps, data and workflow services to Ekvaar OS.' }

const groups = [
  { title: 'Communication', apps: ['Gmail', 'Outlook', 'Slack', 'Discord', 'WhatsApp Business', 'Twilio'] },
  { title: 'Work and knowledge', apps: ['Google Drive', 'Google Calendar', 'GitHub', 'Notion', 'Linear', 'Jira'] },
  { title: 'Commerce', apps: ['Shopify', 'Stripe', 'Razorpay', 'WooCommerce', 'Amazon Seller', 'PayPal'] },
  { title: 'Marketing', apps: ['Instagram', 'LinkedIn', 'Meta Ads', 'Google Ads', 'YouTube', 'Buffer'] },
  { title: 'Data and infrastructure', apps: ['Supabase', 'PostgreSQL', 'AWS', 'Google Cloud', 'Vercel', 'Datadog'] },
  { title: 'Automation and models', apps: ['n8n', 'Composio', 'OmniRoute', 'OpenRouter', 'Google Gemini', 'AWS Bedrock'] },
]

const connectionModes = [
  { icon: KeyRound, title: 'Organisation-owned credentials', body: 'Provider keys are stored for the organisation and never presented as a platform-wide shared key.' },
  { icon: Network, title: 'OAuth where available', body: 'Users connect supported accounts through the provider consent flow instead of copying temporary access tokens.' },
  { icon: Workflow, title: 'Workflow endpoints', body: 'n8n and compatible services can expose controlled triggers for an agent or scheduled job.' },
  { icon: ShieldCheck, title: 'Permission and approval', body: 'A connection makes a tool available; policy still controls whether an agent may execute a sensitive action.' },
]

export default function IntegrationsPage() {
  return (
    <MarketingPage>
      <main>
        <PageIntro eyebrow="Integrations" title="Connect the systems your company already runs on." body="Ekvaar combines native service adapters with organisation-scoped Composio connections. Availability depends on provider setup and the permissions granted to your workspace." />
        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><ProductShot priority src="/site/os/integrations.png" alt="Ekvaar OS integrations workspace" label="Integration workspace" note="The real connection surface inside Ekvaar OS. Connected status is read from the organisation, not hard-coded." /></section>
        <section className="border-y border-white/10 bg-[#080808]"><div className="mx-auto grid max-w-[1440px] gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-4">{connectionModes.map(({ icon: Icon, title, body }) => <article key={title} className="bg-[#080808] p-8 lg:min-h-64"><Icon className="h-5 w-5 text-[#63D7E8]" /><h2 className="mt-12 font-medium">{title}</h2><p className="mt-3 text-sm leading-6 text-white/40">{body}</p></article>)}</div></section>
        <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-3xl"><div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">Connection catalog</div><h2 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Built around real company systems.</h2><p className="mt-6 text-sm leading-7 text-white/44">The groups below reflect adapters and toolkit entries present in the Ekvaar OS codebase. A listed service is not automatically connected: each organisation must configure and verify it.</p></div>
          <div className="mt-14 grid gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-3">{groups.map((group) => <article key={group.title} className="bg-black p-7"><h3 className="text-lg font-medium">{group.title}</h3><div className="mt-6 grid grid-cols-2 gap-2">{group.apps.map((app) => <div key={app} className="border border-white/10 px-3 py-3 text-xs text-white/52">{app}</div>)}</div></article>)}</div>
          <div className="mt-12 border border-[#C0342C]/35 bg-[#C0342C]/8 p-6 text-sm leading-7 text-white/60"><strong className="text-white">Connection is not proof of permission.</strong> Publishing, payments, messages and other external changes can still require founder approval and a provider receipt.</div>
          <Link href="/docs/integrations" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">Read the integration guide <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
    </MarketingPage>
  )
}
