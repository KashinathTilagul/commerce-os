import type { Metadata } from 'next'
import { MarketingPage, PageIntro } from '@/components/marketing/site-shell'

export const metadata: Metadata = {
  title: 'Privacy — Commerce OS',
  description: 'How Commerce OS handles account and organisation data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <MarketingPage>
      <main>
        <PageIntro eyebrow="Privacy" title="What this product stores." body="Commerce OS is operated by ABATA. Account data lives with the organisation you create. The marketing pages do not write to the database." />
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-7 text-[#D5CFC6] sm:px-6">
          <p>Signup stores the name, email, password hash, and organisation you submit, in the production PostgreSQL database. Onboarding stores the organisation profile you add after that.</p>
          <p>Credentials for Shopify, mail, ads, and other tools belong to the organisation that connected them. A new organisation does not receive another workspace’s keys.</p>
          <p>The demo form does not save your message. It opens your email app addressed to kashinathtilagul@gmail.com.</p>
          <p>Questions: <a className="text-[#F3EDE4] underline decoration-white/30 underline-offset-4" href="mailto:kashinathtilagul@gmail.com">kashinathtilagul@gmail.com</a>.</p>
        </div>
      </main>
    </MarketingPage>
  )
}
