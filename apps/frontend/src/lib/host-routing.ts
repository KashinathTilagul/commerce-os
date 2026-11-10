export const MARKETING_ORIGIN = 'https://commerce.abata.tech'
export const APP_ORIGIN = 'https://app.commerce.abata.tech'

export type HostRole = 'marketing' | 'app' | 'preview'

const MARKETING_PAGES = ['/product', '/integrations', '/security', '/docs', '/demo', '/privacy', '/terms']
const MARKETING_FILES = ['/sitemap.xml', '/robots.txt', '/opengraph-image', '/twitter-image']
// NextAuth checks the session from every page. Those reads stay on the
// marketing host and come back empty; the cookie only exists on the app host.
const LOCAL_AUTH = ['/api/auth/session', '/api/auth/csrf', '/api/auth/_log']

export function hostRole(hostname: string | null): HostRole {
  const host = (hostname || '').split(',')[0].trim().split(':')[0].toLowerCase()
  if (host === 'commerce.abata.tech' || host === 'www.commerce.abata.tech') return 'marketing'
  if (host === 'app.commerce.abata.tech') return 'app'
  return 'preview'
}

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true
  return MARKETING_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
    || MARKETING_FILES.includes(pathname)
}

export function isSharedAsset(pathname: string): boolean {
  return /\.(?:png|webp|svg|ico|jpg|jpeg|gif|woff2?)$/i.test(pathname)
}

/**
 * Only emit absolute app-host URLs when running under the split-host Vercel
 * deployment; self-hosted instances keep navigation on their own origin.
 */
export function appHref(
  pathname: string,
  useSplitOrigin = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_APP_URL === APP_ORIGIN,
): string {
  return useSplitOrigin ? `${APP_ORIGIN}${pathname}` : pathname
}

export function hostDecision(
  role: HostRole,
  pathname: string,
  signedIn: boolean,
  search = '',
): { location: string; status: number } | null {
  if (role === 'preview' || isSharedAsset(pathname)) return null
  if (role === 'app' && pathname === '/') {
    return { location: `${APP_ORIGIN}${signedIn ? '/app' : '/login'}${search}`, status: 307 }
  }
  if (role === 'app' && isMarketingPath(pathname)) {
    return { location: `${MARKETING_ORIGIN}${pathname}${search}`, status: 308 }
  }
  if (role === 'marketing' && !isMarketingPath(pathname) && !LOCAL_AUTH.includes(pathname)) {
    return { location: `${APP_ORIGIN}${pathname}${search}`, status: 308 }
  }
  return null
}
