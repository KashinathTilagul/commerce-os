import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { db } from '@/lib/db'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { seedDatabase } from '@/lib/seed'

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
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
