import dynamic from 'next/dynamic'

const Desktop = dynamic(() => import('./_desktop'), { ssr: false })

export default function Page() {
  return <Desktop />
}
