import { getServerSession } from "next-auth"
import { Session } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "./auth"
import { db } from "./db"
import { createApiError } from "./security"

type AuthResult =
  | { success: true; user: Session["user"] }
  | { success: false; response: NextResponse }

export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { success: false, response: createApiError("Unauthorized", 401) }
  }

  return { success: true, user: session.user }
}

export async function requireRole(roles: string | string[]): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult

  const userRoles = Array.isArray(roles) ? roles : [roles]
  const userRole = authResult.user?.role || "USER"

  if (!userRoles.includes(userRole)) {
    return {
      success: false,
      response: createApiError("Forbidden: Insufficient permissions", 403)
    }
  }

  return { success: true, user: authResult.user }
}

export type OrgAuthResult = 
  | { success: true; user: Session["user"]; organizationId: string; session: Session }
  | { success: false; response: NextResponse }

export async function requireOrganization(): Promise<OrgAuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { success: false, response: createApiError("Unauthorized", 401) }
  }

  const membership = session.user.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true, organization: { select: { id: true } } },
      })
    : null

  if (!membership?.organizationId || !membership.organization) {
    return { success: false, response: createApiError("Organization required", 403) }
  }

  return { 
    success: true, 
    user: session.user, 
    organizationId: membership.organizationId,
    session
  }
}
