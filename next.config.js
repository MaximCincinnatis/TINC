/** @type {import('next').NextConfig} */
// Migrated from CRA (react-scripts) to Next.js App Router.
// The @vercel/static-build block + /api rewrite in the old vercel.json were removed so
// Vercel auto-detects Next; the cache-control + security headers are re-expressed below
// to keep behavior equivalent to the previous vercel.json.
const nextConfig = {
  reactStrictMode: true,
  // Lint tooling was removed with react-scripts; don't let (absent) linting gate the build.
  eslint: { ignoreDuringBuilds: true },
  // The SSR data reader (src/lib/loadBurnData.ts) reads these static JSON files via fs at
  // build AND at ISR-revalidate time. Force-trace the two stable-named files into the page
  // function so the read never fails at runtime on Vercel (avoids regenerating an empty shell).
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/data/burn-data.json', './public/data/data-manifest.json'],
    },
  },
  async headers() {
    return [
      {
        // Current burn data — short cache, revalidate at the edge (was in vercel.json).
        source: '/data/burn-data.json',
        headers: [
          { key: 'cache-control', value: 'public, max-age=300, s-maxage=60, stale-while-revalidate=30' },
        ],
      },
      {
        source: '/data/data-manifest.json',
        headers: [
          { key: 'cache-control', value: 'public, max-age=30, s-maxage=30, stale-while-revalidate=15' },
        ],
      },
      {
        // Immutable versioned snapshots: /data/burn-data-v<digits>.json
        source: '/data/:file(burn-data-v[0-9]+\\.json)',
        headers: [
          { key: 'cache-control', value: 'public, max-age=86400, immutable' },
        ],
      },
      {
        // Baseline security headers applied to every response (was in vercel.json).
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
