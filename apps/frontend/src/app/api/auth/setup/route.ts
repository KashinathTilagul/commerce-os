export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export async function GET() {
  try {
    const count = await db.user.count()
    return NextResponse.json({ hasUsers: count > 0 })
  } catch (error: any) {
    console.error('Setup Check Error:', error)
    const isConnRefused = error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')
    const message = isConnRefused
      ? 'Database connection failed: Could not connect to PostgreSQL server on localhost:5432. Ensure PostgreSQL is running.'
      : (error?.message || 'Internal Server Error')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = z.object({ email: z.email(), password: z.string().min(12).max(128), name: z.string().max(120).optional() }).safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Valid email and a password of at least 12 characters required' }, { status: 400 })
    const { email, password, name } = parsed.data

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
    const user = await db.$transaction(async tx => {
    if (await tx.user.count()) throw new Error('OS already initialized')
    const organization = await tx.organization.create({ data: { name: name || 'Commerce OS', slug: `commerce-os-${randomUUID()}` } })
    return tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name || 'Founder',
        role: 'ADMIN',
        orgRole: 'FOUNDER',
        organizationId: organization.id,
      },
    })
    }, { isolationLevel: 'Serializable' })

    return NextResponse.json({ success: true, organizationId: user.organizationId })
  } catch (error) {
    console.error('Setup Post Error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
