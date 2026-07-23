import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
// Global CSS ported verbatim from the CRA app (must be imported in the root layout).
import '../index.css';
import '../App.css';

// SEO re-expressed from the old public/index.html via the Next Metadata API.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.tincburn.fyi/'),
  title: 'TINCBurn.fyi — TINC Burn Tracker (TitanX & DragonX)',
  description:
    'Track real-time TINC (Titan Farms Incentive Token) burns on Ethereum — a TitanX & DragonX ecosystem token. Daily burn totals, rate, holders & supply metrics.',
  alternates: {
    canonical: 'https://www.tincburn.fyi/',
  },
  manifest: '/manifest.json',
  verification: { google: 'TaTNZK7qF2F5CwLQ-VgaZ7qRNmVXwmTzHKLeE7t140o' },
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: 'https://titanfarms.win/Logo.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.tincburn.fyi/',
    title: 'TINCBurn.fyi — TINC Burn Tracker (TitanX & DragonX)',
    description:
      'Real-time TINC (Titan Farms) burn analytics on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate, holders & supply.',
    images: [{ url: 'https://www.tincburn.fyi/og-image.jpg', width: 1200, height: 630, alt: 'TINCBurn.fyi — TINC Burn Tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TINCBurn.fyi — TINC Burn Tracker (TitanX & DragonX)',
    description:
      'Real-time TINC (Titan Farms) burns on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate & holders.',
    images: ['https://www.tincburn.fyi/og-image.jpg'],
  },
};

// theme-color + viewport (Next 14 wants these in a separate `viewport` export).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00D4AA',
};

// JSON-LD @graph structured data (WebSite + Organization + WebApplication), preserved verbatim.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.tincburn.fyi/#website',
      url: 'https://www.tincburn.fyi/',
      name: 'TINCBurn.fyi',
      description: 'Real-time TINC (Titan Farms) burn analytics on Ethereum — TitanX & DragonX ecosystem',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.tincburn.fyi/#org',
      name: 'TINCBurn.fyi',
      url: 'https://www.tincburn.fyi/',
      logo: 'https://www.tincburn.fyi/Logo.png',
    },
    {
      '@type': 'WebApplication',
      name: 'TINCBurn.fyi',
      url: 'https://www.tincburn.fyi/',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      description:
        'Real-time TINC (Titan Farms) burn analytics on Ethereum — a TitanX & DragonX ecosystem token. Burn totals, rate, holders & supply.',
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
