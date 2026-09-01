'use client';
import React, { useState } from 'react';

interface HolderRow {
  a: string;
  b: number;
}
interface HoldersFile {
  updatedAt: string;
  totalSupply: number;
  count: number;
  holders: HolderRow[];
}
type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; msg: string }
  | { kind: 'missing'; file: HoldersFile }
  | { kind: 'found'; file: HoldersFile; row: HolderRow; rank: number };

// Same thresholds as DragonRanks (percent of supply), highest first.
const TIERS: { name: string; pct: number }[] = [
  { name: '龍神 Ryūjin', pct: 10 },
  { name: '将軍 Shōgun', pct: 1 },
  { name: '大名 Daimyō', pct: 0.1 },
  { name: '侍 Samurai', pct: 0.01 },
  { name: '浪人 Rōnin', pct: 0.001 },
  { name: '足軽 Ashigaru', pct: 0.0001 },
];

/**
 * 2026-09-01 UX walk: "how rare is my rank?" is the question holders actually bring to this page.
 * Reads the holder list the updater now publishes (public on-chain balances, refreshed every cycle).
 */
export default function HolderLookup() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>({ kind: 'idle' });

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = input.trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(addr)) {
      setState({ kind: 'error', msg: 'Enter a full address: 0x followed by 40 hex characters.' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/data/holders.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Holder list unavailable (HTTP ${res.status})`);
      const file: HoldersFile = await res.json();
      const idx = file.holders.findIndex((h) => h.a === addr);
      if (idx === -1) {
        setState({ kind: 'missing', file });
        return;
      }
      setState({ kind: 'found', file, row: file.holders[idx], rank: idx + 1 });
    } catch (err) {
      setState({ kind: 'error', msg: err instanceof Error ? err.message : 'Lookup failed' });
    }
  };

  const fmtUtc = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
  };

  return (
    <section className="holder-lookup" aria-labelledby="holder-lookup-title">
      <h3 id="holder-lookup-title">Find your rank</h3>
      <form onSubmit={lookup}>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x… your wallet address"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Wallet address"
        />
        <button type="submit" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? 'Looking…' : 'Look up'}
        </button>
      </form>
      {state.kind === 'error' && <p className="lookup-note lookup-error">{state.msg}</p>}
      {state.kind === 'missing' && (
        <p className="lookup-note">
          Not in the holder list as of {fmtUtc(state.file.updatedAt)}. Balances below 0.0001% of supply are not tracked.
        </p>
      )}
      {state.kind === 'found' && (() => {
        const pct = state.file.totalSupply > 0 ? (state.row.b / state.file.totalSupply) * 100 : 0;
        const tier = TIERS.find((t) => pct >= t.pct);
        return (
          <div className="lookup-result">
            <div className="lookup-tier">{tier ? tier.name : 'Below 足軽 Ashigaru'}</div>
            <div className="lookup-facts">
              <span>
                <strong>{state.row.b.toLocaleString('en-US', { maximumFractionDigits: 3 })}</strong> TINC
              </span>
              <span>
                <strong>{pct.toFixed(pct >= 0.01 ? 3 : 5)}%</strong> of supply
              </span>
              <span>
                rank <strong>#{state.rank}</strong> of {state.file.count.toLocaleString('en-US')} holders
              </span>
            </div>
            <div className="lookup-note">Snapshot {fmtUtc(state.file.updatedAt)} · excludes LP positions</div>
          </div>
        );
      })()}
    </section>
  );
}
