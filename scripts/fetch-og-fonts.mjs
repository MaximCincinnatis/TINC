#!/usr/bin/env node
// Downloads glyph-subset TTFs of the site's three faces for the Open Graph image routes
// (src/app/opengraph-image.tsx, src/app/rank/[address]/opengraph-image.tsx). Satori (next/og)
// needs font bytes; it cannot use the CSS @font-face the page uses. Google's `text=` parameter
// returns a subset containing only the listed glyphs, so the three files stay small enough to
// commit and to trace into the serverless functions (no network at build or request time).
//
//   node scripts/fetch-og-fonts.mjs [outDir]      (default public/og/fonts)
//
// Re-run only when a new glyph is needed (e.g. a new kanji in a rank name).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const KANJI = '龍神将軍大名侍浪人足軽階炎燃焼位概要供給';
const EXTRA = 'ūōŪŌ·—–×→−≈';
const FAMILIES = [
  { file: 'dela-gothic-one.ttf', css: 'Dela+Gothic+One', text: ASCII + KANJI + EXTRA },
  { file: 'zen-maru-gothic.ttf', css: 'Zen+Maru+Gothic:wght@700', text: ASCII + KANJI + EXTRA },
  { file: 'ibm-plex-mono.ttf', css: 'IBM+Plex+Mono:wght@600', text: ASCII + EXTRA },
];
// An old Safari UA makes Google serve TTF (Satori reads TTF/OTF/WOFF, not WOFF2).
const UA = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

const outDir = process.argv[2] || join(process.cwd(), 'public', 'og', 'fonts');
mkdirSync(outDir, { recursive: true });

for (const f of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${f.css}&text=${encodeURIComponent(f.text)}`;
  const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
  const m = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!m) throw new Error(`no font url in CSS for ${f.css}: ${css.slice(0, 200)}`);
  const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
  const sig = buf.subarray(0, 4).toString('latin1');
  if (!(sig === '\0\x01\0\0' || sig === 'true' || sig === 'OTTO' || sig === 'wOFF')) {
    throw new Error(`unexpected font container for ${f.css}: ${JSON.stringify(sig)} from ${m[1]}`);
  }
  writeFileSync(join(outDir, f.file), buf);
  console.log(`${f.file}  ${(buf.length / 1024).toFixed(1)} KB  (${sig === 'wOFF' ? 'woff' : 'ttf/otf'})`);
}
