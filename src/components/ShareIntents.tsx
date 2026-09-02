import React from 'react';
import type { RankResult } from '@/lib/ranks';
import { rankShareText, rankUrl, telegramShareUrl, xPostUrl } from '@/lib/share';

/**
 * Telegram and X share links for a rank card: plain anchors to the platforms' share intents,
 * no hooks, so they render on the server permalink and in the client lookup alike.
 */
export default function ShareIntents({ r }: { r: RankResult }) {
  const url = rankUrl(r.address);
  const text = rankShareText(r);
  return (
    <>
      <a className="btn btn-ghost" href={telegramShareUrl(url, text)} target="_blank" rel="noopener noreferrer">
        Share to Telegram
      </a>
      <a className="btn btn-ghost" href={xPostUrl(url, text)} target="_blank" rel="noopener noreferrer">
        Post to X
      </a>
    </>
  );
}
