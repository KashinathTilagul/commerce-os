export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'

export async function GET() {
  try {
    const count = await db.user.count()
    return NextResponse.json({ hasUsers: count > 0 })
  } catch (error) {
    console.error('Setup Check Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    // Security check: only allow if 0 users exist
    const count = await db.user.count()
    if (count > 0) {
      return NextResponse.json(
        { error: 'OS already initialized. Open registration is disabled.' },
        { status: 403 }
      )
    }

    const hashedPassword = await hash(password, 10)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name || 'Founder',
        role: 'ADMIN',
      },
    })

    return NextResponse.json({ success: true, organizationId: user.id })
  } catch (error) {
    console.error('Setup Post Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
