import { promises as fs } from 'fs';
import path from 'path';

/**
 * Shared pieces for the Open Graph image routes (next/og renders JSX with Satori, which needs
 * font bytes and inline image data rather than CSS). Fonts are glyph subsets fetched once by
 * scripts/fetch-og-fonts.mjs and committed under public/og/fonts; art and ground images live
 * under public/og. Everything is read from disk, so no network is needed at build or request time.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  ink: '#0f0f18',
  cream: '#FAF8F0',
  jade: '#00D4AA',
  gold: '#F5A623',
  crimson: '#E53935',
};

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: 'normal';
}

const ogDir = () => path.join(process.cwd(), 'public', 'og');

const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

let fontsPromise: Promise<OgFont[]> | null = null;

export function ogFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    const files: [string, string, OgFont['weight']][] = [
      ['Dela Gothic One', 'dela-gothic-one.ttf', 400],
      ['Zen Maru Gothic', 'zen-maru-gothic.ttf', 700],
      ['IBM Plex Mono', 'ibm-plex-mono.ttf', 600],
    ];
    fontsPromise = Promise.all(
      files.map(async ([name, file, weight]) => ({
        name,
        data: toArrayBuffer(await fs.readFile(path.join(ogDir(), 'fonts', file))),
        weight,
        style: 'normal' as const,
      }))
    );
  }
  return fontsPromise;
}

/** A public/og asset as a data URI (Satori cannot fetch relative URLs). */
export async function ogDataUri(file: string): Promise<string> {
  const buf = await fs.readFile(path.join(ogDir(), file));
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}
