import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { db } from '@/lib/db'
import { z } from 'zod'
import { hash } from 'bcryptjs'

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
  companyName: z.string().min(1).max(100).optional().default("My Organization"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, companyName } = SignupSchema.parse(body)
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) return createApiError('An account with this email already exists', 409)

    const passwordHash = await hash(password, 12)

    // Execute Organization Creation Flow inside a transaction to ensure consistency
    const result = await db.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4),
          tier: 'STARTER',
        }
      })

      // 2. Create Organization Context
      await tx.organizationContext.create({
        data: {
          organizationId: org.id,
          companyProfile: "",
          brandDna: "",
          industry: "",
          products: "",
          toneOfVoice: "",
          policies: "",
          workflows: "",
          goals: "",
          preferences: "",
          connectedSystems: ""
        }
      })

      // 3. Create Founder User
      const user = await tx.user.create({
        data: { 
          name, 
          email: normalizedEmail, 
          password: passwordHash, 
          role: 'USER',
          orgRole: 'FOUNDER',
          organizationId: org.id
        },
      })

      // 4. Initialize Default Capabilities
      // For now, seed the minimum capabilities required for platform operation
      const defaultCapabilities = [
        { name: "brand_intelligence", description: "Access to Brand Intelligence app", category: "core" },
        { name: "command_center", description: "Access to Command Center", category: "core" },
        { name: "knowledge_drive", description: "Access to Knowledge Drive", category: "core" },
      ]
      
      await tx.capability.createMany({
        data: defaultCapabilities.map(cap => ({
          name: cap.name, description: cap.description, category: cap.category, organizationId: org.id, ownerType: "SYSTEM"
        }))
      })

      // 5. Initialize Default Knowledge Space (Workspace)
      await tx.workspace.create({
        data: {
          title: "Knowledge Base",
          
          organizationId: org.id
        }
      })

      return user
    })

    return createApiResponse({ id: result.id, email: result.email }, 201)
  } catch (e: any) {
    if (e instanceof z.ZodError) return createApiError('Invalid signup details', 400)
    console.error("Signup error:", e)
    return createApiError('Could not create account', 500)
  }
}
