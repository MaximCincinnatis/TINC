/**
 * The questions people bring to a burn tracker, answered once. Rendered in the 問答 block on the
 * home page and emitted as FAQPage JSON-LD from the root layout, so the two never drift.
 * Plain strings on purpose: the same text has to work in markup and in structured data.
 * Facts follow docs.titanfarms.win (emission, farming) and this repo's scanner (burn detection,
 * rank rules). 2026-09-02 SEO pass.
 */
export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ: FaqEntry[] = [
  {
    q: 'What is Titan Farms?',
    a: 'A yield-farming protocol on Uniswap V3 in the TitanX ecosystem. Liquidity providers earn TINC on top of trading fees. The official site is titanfarms.win and the documentation lives at docs.titanfarms.win.',
  },
  {
    q: 'What is TINC?',
    a: 'The Titan Farms Incentive Token, an ERC-20 on Ethereum (contract 0x6532…B385a). It is issued to liquidity providers at a fixed 1 TINC per second, 86,400 a day, with no admin keys to change the rate, and trades against TITANX on Uniswap.',
  },
  {
    q: 'How does the TINC buy and burn work?',
    a: 'Input tokens the farm receives (ETH, TITANX, DRAGONX, HYDRA, HYPER) are swapped for TINC and burned, or burned directly, in capped swaps at set intervals. Every burn is an on-chain transfer of TINC to the zero address, and this tracker counts each one.',
  },
  {
    q: 'What is a deflationary day?',
    a: 'A day in which more TINC was burned than the 86,400 TINC minted. The chart header counts how many of the last 30 days qualified, and the net figure shows whether supply grew or shrank over the window.',
  },
  {
    q: 'How are Dragon Ranks calculated?',
    a: 'By share of circulating supply: Ryūjin 10% or more, Shōgun 1%, Daimyō 0.1%, Samurai 0.01%, Rōnin 0.001%, Ashigaru any balance. Public wallet balances only; liquidity-pool positions and the burn addresses are excluded.',
  },
  {
    q: 'What do TitanX and DragonX have to do with TINC?',
    a: 'TitanX is the ecosystem’s core asset and DragonX a protocol bonded to it. Both are Titan Farms input tokens, so activity in either can feed the TINC burn.',
  },
  {
    q: 'Where does the data come from?',
    a: 'Burn transfers read from an Ethereum node by the tracker’s own scanner, refreshed about every 30 minutes; the page regenerates within five minutes of a new snapshot. Holder balances come from the same node. Every figure links back to Etherscan.',
  },
];
