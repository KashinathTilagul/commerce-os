import type { Metadata } from 'next'
import { MarketingPage } from '@/components/marketing/site-shell'
import { DocsShell } from '@/components/marketing/docs-shell'

export const metadata: Metadata = { title: { default: 'Documentation — Commerce OS', template: '%s — Commerce OS Documentation' }, description: 'Setup and operating guides for Commerce OS.' }

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <MarketingPage><main><DocsShell>{children}</DocsShell></main></MarketingPage>
}
