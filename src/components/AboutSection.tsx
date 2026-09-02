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
  const emitted =
    typeof burnData.periodEmission === 'number' ? burnData.periodEmission : burnData.emissionPerSecond * 86400 * days;
  const deflationary = typeof burnData.deflationaryDays === 'number' ? burnData.deflationaryDays : null;
  const clock = fmtUtcClock(burnData.fetchedAt);
  const date = fmtUtcDate(burnData.fetchedAt);
  const perDay = fmtInt(burnData.emissionPerSecond * 86400);

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
            protocol in the TitanX ecosystem: wallets that provide full-range liquidity on its Uniswap V3 pools
            earn TINC at a fixed 1 TINC per second, {perDay} a day, with no admin keys to change the rate. Input
            tokens the farm takes in (ETH, TITANX, DRAGONX, HYDRA and HYPER) feed a buy-and-burn that buys TINC
            on the market and destroys it.
          </p>
          <p>
            This tracker reads every burn from the chain (each one is a transfer to the zero address), compares
            each day&rsquo;s burns with the day&rsquo;s emission, and calls a day deflationary only when burns win.
          </p>
          {clock && date && (
            <p className="about-live">
              <span className="kanji-small">今</span>
              As of {clock} on {date}: <b>{fmtInt(burnData.totalBurned)} TINC</b> burned in the last {days} days
              against <b>{fmtInt(emitted)} TINC</b> emitted
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
