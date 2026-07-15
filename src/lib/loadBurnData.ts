import { promises as fs } from 'fs';
import path from 'path';
import { BurnData } from '@/types/BurnData';

/**
 * Server-side reader for the static burn data (App Router SSR/ISR).
 *
 * Mirrors the client fileCachedBurnService flow but reads from the filesystem instead of
 * fetch(): resolve the latest versioned file from the manifest (matching the client), then
 * read it. FAIL-SOFT — any error (missing/corrupt file, bad JSON) resolves to `null` so the
 * page renders its loading shell instead of throwing during build/render.
 *
 * The two stable-named files (burn-data.json, data-manifest.json) are force-traced into the
 * serverless function via next.config.js `outputFileTracingIncludes`, so the read also works
 * at ISR-revalidate time on Vercel — burn-data.json is always a copy of the latest snapshot.
 */
export async function loadBurnData(): Promise<BurnData | null> {
  const dir = path.join(process.cwd(), 'public', 'data');

  // 1) Resolve the latest filename from the manifest (matches the client). Fall back to the
  //    stable burn-data.json if the manifest is missing/unreadable.
  let target = 'burn-data.json';
  try {
    const manifestRaw = await fs.readFile(path.join(dir, 'data-manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    if (manifest && typeof manifest.latest === 'string') {
      target = manifest.latest;
    }
  } catch {
    // No/unreadable manifest -> use stable burn-data.json below.
  }

  // 2) Read the resolved file; if the versioned snapshot isn't present at runtime, fall back
  //    to the always-traced stable burn-data.json (identical current data).
  for (const name of [target, 'burn-data.json']) {
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf-8');
      const data = JSON.parse(raw) as BurnData;
      return { ...data, fromCache: true };
    } catch {
      // Try the next candidate.
    }
  }

  return null; // Fail-soft: caller renders the shell.
}
