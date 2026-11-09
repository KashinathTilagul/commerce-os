import type { MetadataRoute } from 'next'

const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://app.commerce.abata.tech'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/app', '/onboarding'] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
