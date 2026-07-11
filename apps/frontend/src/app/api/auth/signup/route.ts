import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { db } from '@/lib/db'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { seedDatabase } from '@/app/api/seed/route'

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password } = SignupSchema.parse(body)
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) return createApiError('An account with this email already exists', 409)

    const passwordHash = await hash(password, 12)
    const user = await db.user.create({
      data: { name, email: normalizedEmail, password: passwordHash, role: 'USER' },
    })

    // Give every new account its own digital workforce (agents, AI systems,
    // integration catalog) — without this a fresh signup has an empty roster.
    await seedDatabase(user.id).catch(() => {})

    return createApiResponse({ id: user.id, email: user.email }, 201)
  } catch (e: any) {
    if (e instanceof z.ZodError) return createApiError('Invalid signup details', 400)
    return createApiError('Could not create account', 500)
  }
}
