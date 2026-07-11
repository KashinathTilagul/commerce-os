import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { createApiError } from "./security"

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { success: false, response: createApiError("Unauthorized", 401) }
  }

  return { success: true, user: session.user }
}

export async function requireRole(roles: string | string[]) {
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
