import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
// Global CSS ported verbatim from the CRA app (must be imported in the root layout).
import '../index.css';
import '../App.css';

// SEO re-expressed from the old public/index.html via the Next Metadata API.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.tincburn.fyi/'),
  title: 'TINCBurn.fyi - Real-time TINC Burn Analytics',
  description:
    'Track real-time TINC token burns on Ethereum: daily burn totals, burn rate, holder distribution, and deflationary supply metrics — live on TINCBurn.fyi.',
  alternates: {
    canonical: 'https://www.tincburn.fyi/',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/Logo.png',
    shortcut: '/Logo.png',
    apple: 'https://titanfarms.win/Logo.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.tincburn.fyi/',
    title: 'TINCBurn.fyi - Real-time TINC Burn Analytics',
    description:
      'Track real-time TINC token burns on Ethereum: daily burn totals, burn rate, holder distribution, and deflationary supply metrics.',
    images: ['https://www.tincburn.fyi/Logo.png'],
  },
  twitter: {
    card: 'summary',
    title: 'TINCBurn.fyi - Real-time TINC Burn Analytics',
    description:
      'Track real-time TINC token burns on Ethereum: daily burn totals, burn rate, and holder distribution.',
    images: ['https://www.tincburn.fyi/Logo.png'],
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
      description: 'Real-time TINC token burn analytics on Ethereum',
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
        'Track real-time TINC token burns on Ethereum: daily burn totals, burn rate, holder distribution, and deflationary supply metrics.',
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
