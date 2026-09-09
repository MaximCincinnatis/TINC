import { FAQ } from '@/lib/faq';
import { fmtInt, fmtUtcClock, fmtUtcDate } from '@/lib/format';
import type { BurnData } from '@/types/BurnData';

/**
 * 解説 What this page tracks (2026-09-02 SEO pass). The one place the page says in prose what
 * TINC, Titan Farms, TitanX and DragonX are, plus a dated sentence with the live figures that a
 * search engine or an answer engine can quote. Rendered on the server from the seeded snapshot
 * (deterministic strings only, so it hydrates cleanly); the 問答 list is a <details> accordion so
 * the block stays calm. Same ink card and torii line as Dragon Ranks (App.css .about-section).
 */
export default function AboutSection({ burnData }: { burnData: BurnData }) {
  const days = burnData.periodDays ?? burnData.dailyBurns.length;
  const accrued =
    typeof burnData.periodEmission === 'number' ? burnData.periodEmission : burnData.emissionPerSecond * 86400 * days;
  const deflationary = typeof burnData.deflationaryDays === 'number' ? burnData.deflationaryDays : null;
  // 2026-09-09: chain readings beside the schedule (older snapshots lack them and fall back)
  const minted = typeof burnData.mintedInWindow === 'number' ? burnData.mintedInWindow : null;
  const supplyChange = typeof burnData.supplyChange === 'number' ? burnData.supplyChange : null;
  const clock = fmtUtcClock(burnData.fetchedAt);
  const date = fmtUtcDate(burnData.fetchedAt);
  const perDay = fmtInt(burnData.emissionPerSecond * 86400);
  // the active input-token list and the protocol fee are read from the contracts at every update
  const inputs = burnData.activeInputTokens && burnData.activeInputTokens.length > 0 ? burnData.activeInputTokens : null;
  const inputList = inputs
    ? inputs.length > 1
      ? `${inputs.slice(0, -1).join(', ')} and ${inputs[inputs.length - 1]}`
      : inputs[0]
    : null;
  const fee = typeof burnData.protocolFeeMaxPercent === 'number' ? burnData.protocolFeeMaxPercent : null;

  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <div className="about-header">
        <h2 className="main-title" id="about-title">
          <span className="kanji-accent">解説</span> What this page tracks
        </h2>
        <p className="subtitle">TINC, the Titan Farms Incentive Token, and its burn</p>
      </div>

      <div className="about-body">
        <div className="about-text">
          <p>
            TINC is the Titan Farms Incentive Token, an ERC-20 on Ethereum. Titan Farms is a yield-farming
            protocol in the TitanX ecosystem: wallets that deposit into its Uniswap V3 farms accrue TINC from a
            fixed 1 TINC per second, {perDay} a day. No key can raise that rate or mint outside it; one admin key
            decides how each second is split between the farms, and TINC is minted only when farmers harvest.
            Trading fees from the farms&rsquo; input tokens{inputList ? ` (today ${inputList})` : ''} go, after{' '}
            {fee !== null ? `a ${fee}% protocol fee` : 'the protocol fee'}, to a buy-and-burn that burns TINC directly
            or buys it on the market and burns it.
          </p>
          <p>
            This tracker reads every burn from the chain (each one is a transfer to the zero address) and every
            mint the same way (a transfer from it), compares each day&rsquo;s burns with the day&rsquo;s emission,
            and calls a day deflationary only when burns win.
          </p>
          {clock && date && (
            <p className="about-live">
              <span className="kanji-small">今</span>
              As of {clock} on {date}: <b>{fmtInt(burnData.totalBurned)} TINC</b> burned in the last {days} days
              against <b>{fmtInt(accrued)} TINC</b> accrued
              {minted !== null && supplyChange !== null ? (
                <>
                  {' '}
                  and <b>{fmtInt(minted)} TINC</b> minted; supply{' '}
                  <b>
                    {supplyChange >= 0 ? '+' : '−'}
                    {fmtInt(Math.abs(supplyChange))}
                  </b>{' '}
                  to {fmtInt(burnData.totalSupply)}
                </>
              ) : null}
              {deflationary !== null ? (
                <>
                  ; <b>{deflationary} of {days} days</b> deflationary
                </>
              ) : null}
              .
            </p>
          )}
        </div>

        <div className="faq">
          <h3 className="faq-title">
            <span className="kanji-small">問答</span> Questions
          </h3>
          {FAQ.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
