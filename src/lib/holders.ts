import { promises as fs } from 'fs';
import path from 'path';
import type { HoldersFile } from '@/lib/ranks';

/**
 * Server-side reader for the holder list the updater publishes to public/data/holders.json
 * (address, balance; sorted by balance, balances > 0 only). Fail-soft like loadBurnData:
 * any problem resolves to null and the caller renders its "not available" state.
 * Traced into the rank routes' serverless functions via next.config.js outputFileTracingIncludes.
 */
export async function loadHolders(): Promise<HoldersFile | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'data', 'holders.json'), 'utf-8');
    const file = JSON.parse(raw) as HoldersFile;
    if (!file || !Array.isArray(file.holders) || typeof file.totalSupply !== 'number') return null;
    return file;
  } catch {
    return null;
  }
}
