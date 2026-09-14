import type { BurnData } from '@/types/BurnData';
import { feePhrase, fmtDay, shortAddress } from '@/lib/protocolFee';

/**
 * 問答 The questions under the explainer (2026-09-02 SEO pass), also emitted as a FAQPage in the
 * layout's JSON-LD from the same list. Two answers read the latest snapshot (2026-09-14): the
 * buy-and-burn answer names the fee as the contracts have it, and the protocol-fee answer counts
 * the collections; both keep a figure-free wording when a snapshot predates the fields.
 */
export interface FaqItem {
  q: string;
  a: string;
}

export function faqWith(data: BurnData | null | undefined): FaqItem[] {
  const fee = feePhrase(data);
  const c = data?.protocolFeeCollected;
  const collector =
    c && typeof c.transactions === 'number' && c.transactions > 0 && c.lastCollectedAt && c.lastCollectedBy
      ? `${
          c.soleCollectorSince
            ? `since ${fmtDay(c.soleCollectorSince)} that has been one externally owned wallet, ${shortAddress(c.lastCollectedBy)}`
            : `today that is ${shortAddress(c.lastCollectedBy)}, which has made ${c.collectionsByLast} of the collections`
        }. It has collected the fee ${c.transactions} times, most recently on ${fmtDay(c.lastCollectedAt)}, and the chain shows it has sold what it collected`
      : 'since Oct 11, 2024 that has been one externally owned wallet; the methodology page shows what it has collected, read from the contracts at every update, and the chain shows it has sold what it collected';
  return [
    {
      q: 'What is Titan Farms?',
      a: 'A yield-farming protocol on Uniswap V3 in the TitanX ecosystem. Liquidity providers earn TINC on top of trading fees. The official site is titanfarms.win and the documentation lives at docs.titanfarms.win.',
    },
    {
      q: 'What is TINC?',
      a: 'The Titan Farms Incentive Token, an ERC-20 on Ethereum (contract 0x6532…B385a). It accrues to liquidity providers at a fixed 1 TINC per second, 86,400 a day, a rate no key can change; TINC is minted when farmers harvest, and one admin key decides how the rate is split between farms. It trades against TITANX on Uniswap.',
    },
    {
      q: 'How does the TINC buy and burn work?',
      a: `The farms’ trading fees in input tokens are split when collected: a protocol fee (${fee ? `${fee}, set per farm by the admin key` : 'set per farm by the admin key, up to 25%'}) goes to a protocol wallet, the rest to the buy-and-burn contract. That contract processes each token in capped swaps at set intervals; as configured today, TINC fees are burned directly, some tokens are partly burned as themselves, whoever calls it keeps a small cut, and the rest is swapped for TINC and burned. The same key sets every one of those settings; the contract itself cannot withdraw. The live settings, the active input-token list and what the fee has collected are on the methodology page, read from the contracts at every update. Every burn is an on-chain transfer of TINC to the zero address, and this tracker counts each one.`,
    },
    {
      q: 'Where does the protocol fee go?',
      a: `To whichever wallet holds the collect role on the farm contracts; ${collector}, on Uniswap and CoW Swap, mostly for USDC; the TINC part of the fee is sold, not burned. What the money paid for is not on the chain.`,
    },
    {
      q: 'What is a deflationary day?',
      a: 'A day in which more TINC was burned than the 86,400 TINC that accrued to farmers. The chart header counts how many of the last 30 days qualified and shows burned, accrued, minted and the change in supply over the window.',
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
      a: 'Burn and mint transfers read from an Ethereum node by the tracker’s own scanner, refreshed about every 30 minutes and published about every two hours; the page regenerates within five minutes of a publish. Holder balances come from the same node. Every figure links back to Etherscan.',
    },
  ];
}

/** The list without a snapshot: the figure-free wording of the two data-driven answers */
export const FAQ: FaqItem[] = faqWith(null);
