import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekvaar OS — Workspace',
  description: 'Your AI-native company operating workspace.',
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
