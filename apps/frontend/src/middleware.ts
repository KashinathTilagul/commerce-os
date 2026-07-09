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
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
    const isDev = process.env.NODE_ENV !== "production"
    const scriptSrc = isDev
      ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic'`
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:${isDev ? " ws:" : ""}; frame-src https: http:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
    )

    response.cookies.set("x-request-nonce", nonce, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

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
