import type { Metadata } from 'next'
import { MarketingPage } from '@/components/marketing/site-shell'
import { DemoForm } from '@/components/marketing/demo-form'

export const metadata: Metadata = {
  title: 'Book a demo — Commerce OS',
  description: 'Request a Commerce OS demo: tell us your name, work email, company and what you want to see, and we will set up a walkthrough.',
  alternates: { canonical: '/demo' },
}

export default function DemoPage() {
  return (
    <MarketingPage>
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7B2A4]">Demo</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Book a demo</h1>
        <p className="mt-4 text-sm leading-7 text-[#D5CFC6]">Your request goes to the ABATA AI team, who will email you to set up the demo. It is not stored inside Commerce OS.</p>
        <DemoForm />
      </main>
    </MarketingPage>
  )
}
