import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      redirect('/app')
    }
  } catch {
    // NextAuth not yet configured (missing NEXTAUTH_SECRET / DATABASE_URL)
  }
  redirect('/login')
}
