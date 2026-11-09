import type { MetadataRoute } from 'next'

const origin = 'https://commerce.abata.tech'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/app', '/onboarding'] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
