/** @type {import('next').NextConfig} */
const isVercel = Boolean(process.env.VERCEL);

const heavyPdfExcludes = [
  './node_modules/@sparticuz/**',
  './node_modules/puppeteer-core/**',
];

const sharpExcludes = [
  './node_modules/sharp/**',
  './node_modules/@img/**',
];

const nextConfig = {
  // Keep standalone for Docker/VPS builds; omit on Vercel so serverless traces stay lean.
  ...(isVercel ? {} : { output: 'standalone' }),
  outputFileTracingExcludes: {
    '*': [
      './node_modules/playwright/**',
      './node_modules/playwright-core/**',
      './node_modules/@playwright/**',
      './node_modules/typescript/**',
      './node_modules/eslint/**',
      './node_modules/@eslint/**',
      './node_modules/tsx/**',
      './e2e/**',
      './scripts/**',
      './public/site/**',
      ...(isVercel ? ['./node_modules/@img/sharp-libvips-darwin-arm64/**'] : []),
    ],
    ...(isVercel
      ? {
          'instrumentation': [...heavyPdfExcludes, ...sharpExcludes],
          '/instrumentation': [...heavyPdfExcludes, ...sharpExcludes],
          '/api/cron/**': [...heavyPdfExcludes, ...sharpExcludes],
          '/api/agents/**': [...heavyPdfExcludes, ...sharpExcludes],
          '/api/campaign-launches/**': [...heavyPdfExcludes, ...sharpExcludes],
          '/api/marketing/**': sharpExcludes,
          '/api/internal/**': sharpExcludes,
        }
      : {}),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  compiler: {
    removeConsole: false,
  },
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'X-Robots-Tag', value: 'noindex' },
      ],
    },
  ],
  async redirects() {
    return [
      { source: '/admin', destination: '/', permanent: false },
    ];
  },
};

export default nextConfig;
