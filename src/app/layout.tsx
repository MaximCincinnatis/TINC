import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { FAQ } from '@/lib/faq';
// Global CSS ported verbatim from the CRA app (must be imported in the root layout).
import '../index.css';
import '../App.css';

// SEO re-expressed from the old public/index.html via the Next Metadata API.
//
// 2026-07-24 SEO RETARGET (Ahrefs-verified): title now LEADS with "Titan Farms" —
//   350 US searches/mo at KD 0 and CPC $8. That is the single most winnable term across all
//   three sites: essentially zero competition, and an exact intent match since TINC *is* the
//   Titan Farms Incentive Token. It was previously buried in the description while the title
//   led with the brand string "TINCBurn.fyi", which has no search volume of its own.
//   For reference, "tinc token" has 0 US volume — there is nothing to rank for on the token name.
//   Secondary: "titanx" (1.2k, KD 45) and "dragonx crypto" (20, KD 30) via the ecosystem suffix.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.tincburn.fyi/'),
  title: 'Titan Farms TINC Burn Tracker — TitanX & DragonX Ecosystem',
  description:
    'Live Titan Farms (TINC) burn tracker — real-time TINC burns on Ethereum: daily totals, burn rate, holders and supply across the TitanX & DragonX ecosystem.',
  alternates: {
    canonical: 'https://www.tincburn.fyi/',
  },
  manifest: '/manifest.json',
  verification: { google: 'TaTNZK7qF2F5CwLQ-VgaZ7qRNmVXwmTzHKLeE7t140o' },
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    // 2026-09-02: served from this host; the touch icon used to point at titanfarms.win
    apple: '/Logo.png',
  },
  // 2026-09-02: og:image and twitter:image come from app/opengraph-image.tsx (file-based metadata,
  // rendered per deploy with the current 30-day verdict) instead of the static stock-photo og-image.jpg.
  openGraph: {
    type: 'website',
    url: 'https://www.tincburn.fyi/',
    title: 'Titan Farms TINC Burn Tracker — TitanX & DragonX Ecosystem',
    description:
      'Real-time TINC (Titan Farms) burn analytics on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate, holders & supply.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Titan Farms TINC Burn Tracker — TitanX & DragonX Ecosystem',
    description:
      'Real-time TINC (Titan Farms) burns on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate & holders.',
  },
};

// theme-color + viewport (Next 14 wants these in a separate `viewport` export).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00D4AA',
};

// JSON-LD @graph structured data (WebSite + Organization + WebApplication), preserved verbatim.
// 2026-07-24 SEO: `url` values dropped their trailing slash to match the canonical Next actually
// emits for this site (source says '…fyi/', rendered output is '…fyi') and the sitemap <loc>.
// @id values are opaque identifiers and are deliberately left unchanged.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.tincburn.fyi/#website',
      url: 'https://www.tincburn.fyi',
      name: 'TINCBurn.fyi',
      // 2026-09-02 SEO: the names people search for; Google picks the site name from these
      alternateName: ['Titan Farms TINC Burn Tracker', 'TINC Burn Tracker'],
      publisher: { '@id': 'https://www.tincburn.fyi/#org' },
      description: 'Real-time TINC (Titan Farms) burn analytics on Ethereum — TitanX & DragonX ecosystem',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.tincburn.fyi/#org',
      name: 'TINCBurn.fyi',
      url: 'https://www.tincburn.fyi',
      logo: 'https://www.tincburn.fyi/Logo.png',
      sameAs: ['https://github.com/MaximCincinnatis/TINC'],
    },
    {
      '@type': 'WebApplication',
      name: 'TINCBurn.fyi',
      url: 'https://www.tincburn.fyi',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description:
        'Real-time TINC (Titan Farms) burn analytics on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate, holders & supply.',
    },
    // 2026-09-02 SEO: the burn series as a Dataset (Google Dataset Search lists these) …
    {
      '@type': 'Dataset',
      '@id': 'https://www.tincburn.fyi/#dataset',
      name: 'TINC daily burns (Titan Farms Incentive Token, Ethereum)',
      description:
        'Daily TINC burned, burn transaction counts, circulating supply and holder tiers for the last 30 days, read from an Ethereum node and refreshed about every 30 minutes. TINC is the Titan Farms Incentive Token in the TitanX ecosystem.',
      url: 'https://www.tincburn.fyi',
      creator: { '@id': 'https://www.tincburn.fyi/#org' },
      isAccessibleForFree: true,
      keywords: ['TINC', 'Titan Farms', 'TitanX', 'DragonX', 'token burn', 'Ethereum', 'deflationary'],
      variableMeasured: ['TINC burned per day', 'burn transactions per day', 'circulating supply', 'holders per rank tier'],
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: 'https://www.tincburn.fyi/data/burn-data.json',
        },
      ],
    },
    // … and the 問答 answers as a FAQPage, from the same list the page renders (src/lib/faq.ts)
    {
      '@type': 'FAQPage',
      '@id': 'https://www.tincburn.fyi/#faq',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
