import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/PageChrome';
import { SITE } from '@/lib/share';

/**
 * /methodology: how the numbers on the home page are made, in the tracker's own words. The
 * honest home for every caveat (UTC days, the rolling window, LP exclusions, gap recovery).
 * Facts follow scripts/fetch-burn-data.js, src/services/burnService.ts and scripts/excluded-addresses.js.
 * Static: nothing here changes with the data. 2026-09-02 SEO pass.
 */
export const metadata: Metadata = {
  title: 'How TINCBurn.fyi measures TINC burns · Methodology',
  description:
    'What counts as a TINC burn, where the numbers come from (an Ethereum node, not an API), how the daily and 30-day deflationary verdicts are computed, how Dragon Ranks exclude liquidity pools, and how fresh the data is.',
  alternates: { canonical: `${SITE}/methodology` },
  openGraph: {
    type: 'article',
    url: `${SITE}/methodology`,
    title: 'How TINCBurn.fyi measures TINC burns',
    description: 'Burn detection, emission, the deflationary-day rule, holder ranks, freshness and known limits of the Titan Farms TINC burn tracker.',
  },
};

const TINC = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const LP1 = '0x72e0de1cc2c952326738dac05bacb9e9c25422e3';
const LP2 = '0xf89980f60e55633d05e72881ceb866dbb7f50580';

export default function MethodologyPage() {
  return (
    <div className="App">
      <SiteHeader eyebrow="龍炎 Methodology" />
      <main className="container">
        <section className="about-section doc" aria-labelledby="method-title">
          <div className="about-header">
            <h2 className="main-title" id="method-title">
              <span className="kanji-accent">方法</span> How the numbers are made
            </h2>
            <p className="subtitle">Every figure on the tracker is read from Ethereum. This page says exactly how.</p>
          </div>
          <div className="doc-body">
            <h3>
              <span className="kanji-small">燃焼</span> What counts as a burn
            </h3>
            <p>
              A burn is an ERC-20 <code>Transfer</code> event on the TINC contract whose recipient is the zero address
              (<code>0x000…000</code>). That is the event the token emits when TINC is destroyed, whether the buy-and-burn
              contract or anyone else triggers it. The scanner asks a dedicated Ethereum node for those events with{' '}
              <code>eth_getLogs</code> in chunks of 800 blocks, keeps the amount, transaction hash and sender of each,
              and groups them by the UTC date of their block. Transfers to other so-called dead addresses are not burns
              in TINC&rsquo;s design and are not counted.
            </p>

            <h3>
              <span className="kanji-small">供給</span> Emission and supply
            </h3>
            <p>
              TINC is issued to Titan Farms liquidity providers at a fixed 1 TINC per second, 86,400 a day, and the
              protocol has no admin keys to change that, so the tracker uses the constant rather than re-reading it.
              Circulating supply is <code>totalSupply()</code> read from the contract at every update; burned TINC has
              already left it.
            </p>

            <h3>
              <span className="kanji-small">判定</span> The deflationary verdict
            </h3>
            <p>
              A day is deflationary when more than 86,400 TINC was burned in it. The 30-day figures compare the burns
              inside the window with 30 × 86,400 TINC emitted over the same days, and the net figure is the difference:
              supply grew when it is positive, shrank when it is negative. Days are UTC days, and the current day stays
              partial until it ends, so its bar can only grow.
            </p>

            <h3>
              <span className="kanji-small">龍階</span> Holders and Dragon Ranks
            </h3>
            <p>
              Wallet balances come from the same node: a snapshot of all holders, kept current by replaying{' '}
              <code>Transfer</code> events at each update. The two liquidity pools (TINC/TITANX{' '}
              <a href={`https://etherscan.io/address/${LP1}`} target="_blank" rel="noopener noreferrer">
                {LP1.slice(0, 6)}…{LP1.slice(-4)}
              </a>{' '}
              and{' '}
              <a href={`https://etherscan.io/address/${LP2}`} target="_blank" rel="noopener noreferrer">
                {LP2.slice(0, 6)}…{LP2.slice(-4)}
              </a>
              ) and the burn addresses are excluded, so a wallet that only holds TINC inside a pool position is not
              counted. Ranks are shares of circulating supply: Ryūjin 10% or more, Shōgun 1%, Daimyō 0.1%, Samurai
              0.01%, Rōnin 0.001%, Ashigaru any balance above zero. &ldquo;Total Warriors&rdquo; is the number of
              wallets with a balance above zero after those exclusions.
            </p>

            <h3>
              <span className="kanji-small">更新</span> Freshness
            </h3>
            <p>
              The updater scans every 30 minutes and publishes every fourth run, so a new snapshot reaches the site
              about every two hours; the page itself regenerates within five minutes of a publish. The chip in the
              header shows the snapshot time, and &ldquo;Cached&rdquo; in the footer means the page served the last
              published snapshot rather than a live query. A burn confirmed a minute ago can therefore take one cycle
              to appear.
            </p>

            <h3>
              <span className="kanji-small">限界</span> Known limits
            </h3>
            <ul>
              <li>
                The tracker keeps a rolling 30-day window and no archive of earlier days; a day can be revised while it
                is inside the window, as the scanner recovers any block range the node failed to answer the first time.
              </li>
              <li>Node outages leave gaps that are retried and backfilled; until then a day can read low.</li>
              <li>Holder counts exclude TINC held only through liquidity positions.</li>
              <li>Amounts are shown rounded; the JSON below carries full precision.</li>
              <li>The tracker is independent of Titan Farms and reads public chain data only.</li>
            </ul>

            <h3>
              <span className="kanji-small">資料</span> Data and contracts
            </h3>
            <ul>
              <li>
                Current window: <a href="/data/burn-data.json">/data/burn-data.json</a> · holders:{' '}
                <a href="/data/holders.json">/data/holders.json</a> · summary for answer engines:{' '}
                <a href="/llms.txt">/llms.txt</a>
              </li>
              <li>
                TINC contract:{' '}
                <a href={`https://etherscan.io/address/${TINC}`} target="_blank" rel="noopener noreferrer">
                  {TINC}
                </a>
              </li>
              <li>
                Source:{' '}
                <a href="https://github.com/MaximCincinnatis/TINC" target="_blank" rel="noopener noreferrer">
                  github.com/MaximCincinnatis/TINC
                </a>{' '}
                · Titan Farms documentation:{' '}
                <a href="https://docs.titanfarms.win/" target="_blank" rel="noopener noreferrer">
                  docs.titanfarms.win
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
