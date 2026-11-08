import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { RATE_LIMIT_CONFIG, checkRateLimit, getClientIP } from "./lib/security"
import { isViewerWriteBlocked } from "./lib/viewer-guard"

export async function middleware(req: NextRequest) {
  const ip = getClientIP(req)
  const path = req.nextUrl.pathname

  const rateLimitResult = checkRateLimit(ip, path)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter) } }
    )
  }

  // Read-only reviewer accounts (orgRole VIEWER) may look but not change anything.
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const token = await getToken({ req }).catch(() => null)
    if (isViewerWriteBlocked(req.method, path, token?.orgRole as string | undefined)) {
      return NextResponse.json({ error: 'This is a read-only demo account' }, { status: 403 })
    }
  }

  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  const embeddedOpenDesign = path.startsWith('/api/open-design/proxy')
  response.headers.set("X-Frame-Options", embeddedOpenDesign ? "SAMEORIGIN" : "DENY")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'self' https:; frame-ancestors ${embeddedOpenDesign ? "'self'" : "'none'"}; base-uri 'self'; form-action 'self'`
  )
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)",],
}
