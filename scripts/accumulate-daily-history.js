#!/usr/bin/env node
/**
 * Folds the rolling 30-day window (public/data/burn-data.json) into the daily archive
 * (public/data/daily-history.json) that the /burns pages and the sitemap read. 2026-09-02.
 *
 * Every day inside the current window overwrites its archive entry: the window is re-verified
 * on each update, so a day the scanner backfilled after an RPC gap corrects itself for up to 30
 * days. Days that have left the window keep their last value. The snapshot's own day is marked
 * final:false because it is still filling.
 *
 * Runs from cron twice a day (00:35 and 12:35 UTC on the dev box); the auto-updater commits
 * public/data/ with everything else, so the archive reaches Vercel with the next data push.
 * Safe to run any time:  node scripts/accumulate-daily-history.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'data', 'burn-data.json');
const dst = path.join(root, 'public', 'data', 'daily-history.json');

const burn = JSON.parse(fs.readFileSync(src, 'utf8'));
if (!Array.isArray(burn.dailyBurns) || burn.dailyBurns.length === 0) {
  console.error('daily-history: burn-data.json has no dailyBurns; nothing done');
  process.exit(1);
}
const emissionPerDay = (burn.emissionPerSecond || 1) * 86400;

let hist = { since: null, updatedAt: null, emissionPerDay, days: [] };
if (fs.existsSync(dst)) {
  try {
    const prev = JSON.parse(fs.readFileSync(dst, 'utf8'));
    if (prev && Array.isArray(prev.days)) hist = prev;
  } catch (e) {
    console.error('daily-history: existing file unreadable, starting over:', e.message);
  }
}

const byDate = new Map(hist.days.map((d) => [d.date, d]));
const snapshotDay = String(burn.fetchedAt || new Date().toISOString()).slice(0, 10);
let changed = 0;
for (const d of burn.dailyBurns) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
  const entry = {
    date: d.date,
    amountTinc: Math.round((d.amountTinc || 0) * 1e6) / 1e6,
    transactionCount: d.transactionCount || 0,
    final: d.date < snapshotDay,
  };
  const old = byDate.get(d.date);
  if (!old || old.amountTinc !== entry.amountTinc || old.transactionCount !== entry.transactionCount || old.final !== entry.final) changed++;
  byDate.set(d.date, entry);
}

hist.days = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
hist.since = hist.days[0].date;
hist.updatedAt = burn.fetchedAt || new Date().toISOString();
hist.emissionPerDay = emissionPerDay;

fs.writeFileSync(dst, JSON.stringify(hist, null, 1) + '\n');
const open = hist.days.filter((d) => !d.final).length;
console.log(`${new Date().toISOString()} daily-history: ${hist.days.length} days ${hist.since}..${hist.days[hist.days.length - 1].date}, ${changed} changed, ${open} still open`);
