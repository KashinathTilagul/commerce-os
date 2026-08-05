'use client'

import dynamic from 'next/dynamic'

const Desktop = dynamic(() => import('./desktop-view'), { ssr: false })

export default function Page() {
  return <Desktop />
}
