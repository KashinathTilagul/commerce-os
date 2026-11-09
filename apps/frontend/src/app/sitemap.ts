import type { MetadataRoute } from 'next'

const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://app.commerce.abata.tech'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/product', '/integrations', '/security', '/docs', '/signup', '/login', '/demo', '/privacy', '/terms']
  return paths.map((path) => ({
    url: `${origin}${path || '/'}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }))
}
