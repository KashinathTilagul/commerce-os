export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { requireAuth } from '@/lib/auth-guard'
import { validateNewPassword } from '@/lib/account-password'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, password: true },
  })
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  return NextResponse.json({ username: user.email, hasPassword: Boolean(user.password) })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await request.json().catch(() => null)
  const error = validateNewPassword(body?.newPassword)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { password: true },
  })
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  if (user.password) {
    if (typeof body?.currentPassword !== 'string' || !(await compare(body.currentPassword, user.password))) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
  }

  await db.user.update({
    where: { id: auth.user.id },
    data: { password: await hash(body.newPassword, 12) },
  })

  return NextResponse.json({ username: auth.user.email, hasPassword: true })
}
