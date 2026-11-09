import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { HomePage } from '@/components/marketing/home-page'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Commerce OS — The operating system for commerce',
  description: 'A desktop where orders, inventory, finance, campaigns and an AI workforce share one organisation. Consequential actions wait for a person.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Commerce OS — The operating system for commerce',
    description: 'Orders, inventory, finance, campaigns and an AI workforce on one desktop, with human approval for consequential actions.',
    url: '/',
    siteName: 'Commerce OS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Commerce OS — The operating system for commerce',
    description: 'One organisation. One desktop. Approval before the consequential step.',
  },
}

export default async function RootPage() {
  let session: Session | null = null
  try {
    session = await getServerSession(authOptions)
  } catch {
    session = null
  }
  if (session?.user) redirect('/app')
  return <HomePage />
}
