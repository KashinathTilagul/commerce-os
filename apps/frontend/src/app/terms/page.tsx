import type { Metadata } from 'next'
import { MarketingPage, PageIntro } from '@/components/marketing/site-shell'

export const metadata: Metadata = {
  title: 'Terms — Commerce OS',
  description: 'Terms for using the Commerce OS private beta.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <MarketingPage>
      <main>
        <PageIntro eyebrow="Terms" title="Private beta terms." body="Commerce OS is a private beta operated by ABATA. These terms cover use of the site and the workspace. They are not a paid subscription agreement." />
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-7 text-[#D5CFC6] sm:px-6">
          <p>You may create an organisation and use the modules that are actually available in your workspace. Pricing tiers on the site are indicative. The product does not charge a card.</p>
          <p>You are responsible for the accounts you connect and for approving actions that leave the workspace, including publishing, payments, and messages.</p>
          <p>The service can change during the beta, including when the production database or a connected provider is unavailable. Signup needs that database.</p>
          <p>The source repository is private. Access to the product is through this site, not a public code link.</p>
          <p>Contact: <a className="text-[#F3EDE4] underline decoration-white/30 underline-offset-4" href="mailto:kashinathtilagul@gmail.com">kashinathtilagul@gmail.com</a>.</p>
        </div>
      </main>
    </MarketingPage>
  )
}
