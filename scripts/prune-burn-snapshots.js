#!/usr/bin/env node
/**
 * Prune old versioned burn-data snapshots.
 *
 * WHY THIS EXISTS (2026-07-25)
 * Every update writes `burn-data-v<epoch>.json` into BOTH data/ and public/data/, and
 * safe-auto-updates.js stages the whole directory (`git add data/ public/data/`). Nothing
 * ever deleted them, so ~20,000 snapshots (~576MB working tree) had accumulated and were
 * committed permanently — growing every clone, checkout and Vercel build forever.
 *
 * WHY DELETING THEM IS SAFE
 * data-manifest.json names exactly ONE file (`latest`). There is no index of history, and
 * nothing enumerates old versions. Both readers also fall back to the stable burn-data.json:
 *   - src/lib/loadBurnData.ts:35      for (const name of [target, 'burn-data.json'])
 *   - src/services/fileCachedBurnService.ts:15  let dataUrl = '/data/burn-data.json' // fallback
 * So old snapshots are unreferenced by construction.
 *
 * SAFETY RULES ENFORCED BELOW
 *   1. Only files matching /^burn-data-v\d+\.json$/ are ever considered. burn-data.json,
 *      burn-data.backup.json and data-manifest.json can never match, so they are untouchable.
 *   2. The file named by data-manifest.json `latest` is ALWAYS pinned, regardless of age.
 *   3. The newest KEEP snapshots are retained as a buffer for browsers holding a slightly
 *      stale manifest (manifest is fetched with cache:'default', so it can lag).
 *
 * Usage:  node scripts/prune-burn-snapshots.js [--dry-run] [--keep N]
 *         BURN_SNAPSHOT_KEEP=50 node scripts/prune-burn-snapshots.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['data', 'public/data'];
const SNAPSHOT_RE = /^burn-data-v(\d+)\.json$/;

function keepCount() {
  const i = process.argv.indexOf('--keep');
  if (i !== -1 && process.argv[i + 1]) return parseInt(process.argv[i + 1], 10);
  return parseInt(process.env.BURN_SNAPSHOT_KEEP || '50', 10);
}

function prune(dirRel, keep, dryRun) {
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) return { dir: dirRel, total: 0, kept: 0, removed: 0, pinned: null };

  // Rule 2: never delete whatever the manifest currently points at.
  let pinned = null;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'data-manifest.json'), 'utf8'));
    if (m && typeof m.latest === 'string') pinned = m.latest;
  } catch {
    // No manifest here (data/ may not have one) — the newest-N rule still applies.
  }

  // Sort by the epoch embedded in the NAME, not mtime: a git checkout rewrites mtimes.
  const snaps = fs.readdirSync(dir)
    .filter((f) => SNAPSHOT_RE.test(f))
    .sort((a, b) => Number(b.match(SNAPSHOT_RE)[1]) - Number(a.match(SNAPSHOT_RE)[1]));

  const survivors = new Set(snaps.slice(0, Math.max(keep, 0)));
  if (pinned) survivors.add(pinned);

  const doomed = snaps.filter((f) => !survivors.has(f));
  if (!dryRun) {
    for (const f of doomed) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch (e) {
        console.warn(`  ! could not remove ${f}: ${e.message}`);
      }
    }
  }
  return { dir: dirRel, total: snaps.length, kept: snaps.length - doomed.length, removed: doomed.length, pinned };
}

const dryRun = process.argv.includes('--dry-run');
const keep = keepCount();
if (!Number.isFinite(keep) || keep < 1) {
  console.error(`Refusing to run with keep=${keep}; must be >= 1.`);
  process.exit(1);
}

console.log(`${dryRun ? '[DRY RUN] ' : ''}Pruning burn-data snapshots (keeping newest ${keep} + manifest target)`);
let removedTotal = 0;
for (const d of DIRS) {
  const r = prune(d, keep, dryRun);
  removedTotal += r.removed;
  console.log(`  ${r.dir.padEnd(12)} total=${r.total} kept=${r.kept} removed=${r.removed}${r.pinned ? ` pinned=${r.pinned}` : ''}`);
}
console.log(`${dryRun ? '[DRY RUN] would remove' : 'Removed'} ${removedTotal} file(s).`);
