export const MARKETING_ORIGIN = 'https://commerce.abata.tech'
export const APP_ORIGIN = 'https://app.commerce.abata.tech'

export type HostRole = 'marketing' | 'app' | 'preview'

const MARKETING_PAGES = ['/product', '/integrations', '/security', '/docs', '/demo', '/privacy', '/terms']
const MARKETING_FILES = ['/sitemap.xml', '/robots.txt', '/opengraph-image', '/twitter-image']

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
  if (role === 'marketing' && !isMarketingPath(pathname)) {
    return { location: `${APP_ORIGIN}${pathname}${search}`, status: 308 }
  }
  return null
}
