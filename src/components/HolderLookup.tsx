'use client';

import React, { useState } from 'react';
import RankCard from './RankCard';
import CopyLinkButton from './CopyLinkButton';
import ShareIntents from './ShareIntents';
import { normalizeAddress, rankLookup, RANK_TIERS, type HoldersFile, type RankResult } from '@/lib/ranks';
import { fmtUtcClock } from '@/lib/format';
import { rankUrl } from '@/lib/share';

/** Static fallback for the faded example beside the empty form, used only when the page could
 *  not derive a real rank-50 wallet from the current snapshot. */
const EXAMPLE: RankResult = {
  address: '0x0000000000000000000000000000000000000000',
  balance: 27803,
  pct: 0.0993,
  rank: 50,
  count: 957,
  totalSupply: 28000000,
  updatedAt: '',
  tier: RANK_TIERS.find((t) => t.key === 'samurai') ?? null,
  next: RANK_TIERS.find((t) => t.key === 'daimyo') ?? null,
  shortfall: 153,
  progress: 0.98,
};

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; msg: string }
  | { kind: 'missing'; file: HoldersFile }
  | { kind: 'found'; result: RankResult };

/**
 * 位 Find your rank. Lives inside the Dragon Ranks container, between the six tier cards and
 * the Overview row, and answers with a rank card in the wallet's tier colour plus a share link.
 * Reads public/data/holders.json (public on-chain balances the updater publishes every cycle).
 */
export default function HolderLookup({ example = null }: { example?: RankResult | null }) {
  const sample = example ?? EXAMPLE;
  const [input, setInput] = useState('');
  const [state, setState] = useState<LookupState>({ kind: 'idle' });

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = normalizeAddress(input);
    if (!addr) {
      setState({ kind: 'error', msg: 'Enter a full address: 0x followed by 40 hex characters.' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/data/holders.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Holder list unavailable (HTTP ${res.status})`);
      const file = (await res.json()) as HoldersFile;
      const result = rankLookup(file, addr);
      setState(result ? { kind: 'found', result } : { kind: 'missing', file });
    } catch (err) {
      setState({ kind: 'error', msg: err instanceof Error ? err.message : 'Lookup failed' });
    }
  };

  const found = state.kind === 'found' ? state.result : null;
  const snapshot = found ? found.updatedAt : state.kind === 'missing' ? state.file.updatedAt : null;

  let note: React.ReactNode = 'Public on-chain balances · excludes LP positions · any wallet holding TINC has a rank';
  if (state.kind === 'error') note = state.msg;
  if (state.kind === 'missing') note = `Not in the holder snapshot from ${fmtUtcClock(state.file.updatedAt)}: no TINC balance at that time, or only an LP position.`;
  if (found && snapshot) note = `Snapshot ${fmtUtcClock(snapshot)} · excludes LP positions · public on-chain balances`;

  return (
    <div className={`lookup-row${found ? ' has-result' : ' at-rest'}`} id="find-your-rank">
      <div className="rank-card lookup-panel" style={{ '--rank-color': '#00D4AA' } as React.CSSProperties}>
        <div className="rank-corner"></div>
        <div className="lookup-title">
          <span className="kanji-small">位</span> Find your rank
        </div>
        <div className="lookup-sub">Any wallet · public balances</div>
        <form className="lookup-form" onSubmit={lookup}>
          <input
            className="lookup-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="0x… wallet address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Wallet address"
          />
          <button type="submit" className="btn btn-primary" disabled={state.kind === 'loading'}>
            {state.kind === 'loading' ? 'Looking…' : 'Look up'}
          </button>
        </form>
        <p className={`lookup-note${state.kind === 'error' ? ' is-error' : ''}`}>{note}</p>
      </div>

      {found ? (
        <div className="lookup-result">
          <RankCard r={found} />
          <div className="lookup-share">
            <CopyLinkButton url={rankUrl(found.address)} />
            <ShareIntents r={found} />
            <a className="btn btn-ghost" href={`/rank/${found.address}`}>
              Open card
            </a>
          </div>
        </div>
      ) : (
        <div className="lookup-result lookup-example" aria-hidden="true">
          <div className="lookup-sub">
            <span className="kanji-small">例</span>{' '}
            {example ? `Example · rank ${example.rank.toLocaleString('en-US')} today` : 'Example answer'}
          </div>
          <RankCard r={sample} />
          <div className="lookup-share">
            <span className="btn btn-ghost">Copy share link</span>
            <span className="btn btn-ghost">Share to Telegram</span>
            <span className="btn btn-ghost">Post to X</span>
          </div>
        </div>
      )}
    </div>
  );
}
