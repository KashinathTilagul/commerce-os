import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { RATE_LIMIT_CONFIG, checkRateLimit, getClientIP } from "./lib/security"

export default withAuth(
  async function middleware(req) {
    const ip = getClientIP(req)
    const path = req.nextUrl.pathname

    const rateLimitResult = checkRateLimit(ip, path)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter) } }
      )
    }

    const response = NextResponse.next()

    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
    )

    return response
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const path = req.nextUrl.pathname

        const publicPaths = ["/login", "/auth/error", "/api/auth", "/_next", "/favicon.ico"]
        if (publicPaths.some(p => path.startsWith(p))) {
          return true
        }

        if (path.startsWith("/api/health") || path === "/") {
          return true
        }

        return !!token
      },
    },
    pages: {
      signIn: "/login",
    }
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
