require('dotenv').config();
const fs = require('fs');
const path = require('path');
/**
 * Protocol facts read from the Titan Farms contracts at every update (2026-09-09).
 *
 *   tincPools            every farm pool that holds TINC, found from the FarmKeeper's farm list
 *                        (so a farm added later is picked up without anyone editing a list)
 *   poolShare            TINC held by those pools as a share of totalSupply
 *   activeInputTokens    input tokens the buy-and-burn processes today (not paused, not disabled)
 *   pausedInputTokens    input tokens whose fees are collected but paused
 *   protocolFeeMaxPercent the highest protocol fee on the farms that receive emission, in percent
 *   protocolFeeMinPercent the lowest (2026-09-14; equal to the highest when every farm agrees)
 *   buyAndBurnSettings   per input token: the caller's cut, the share burned as itself, the share
 *                        swapped for TINC, and the balance waiting in the contract (2026-09-14)
 *   protocolFeeCollected what the fee has collected since launch, from the keepers' collection
 *                        events (scripts/protocol-fee.js, 2026-09-14)
 *
 * The pools are also written to data/cache/tinc-pools.json for the holder pipeline, which
 * excludes them from the ranks. Display data, like the holder stats: on any failure the
 * previous values are kept and marked stale, so a decode problem can never block a burn
 * update. RPC calls go through the caller's failfast wrapper, the same one the burn scan uses.
 */
const { Interface } = require('ethers');
const { updateProtocolFee } = require('./protocol-fee');

const TINC = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const FARM_KEEPER = '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223';
const BUY_AND_BURN = '0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3';
const POOLS_FILE = path.join(__dirname, '..', 'data', 'cache', 'tinc-pools.json');

// Fragments copied from the verified sources (UniversalBuyAndBurn.inputTokens, FarmKeeper.farmViews)
const buyAndBurnAbi = new Interface([
  {
    inputs: [], name: 'inputTokens', stateMutability: 'view', type: 'function',
    outputs: [{ type: 'tuple[]', name: '', components: [
      { name: 'id', type: 'address' }, { name: 'totalTokensUsedForBuyAndBurn', type: 'uint256' },
      { name: 'totalTokensBurned', type: 'uint256' }, { name: 'totalIncentiveFee', type: 'uint256' },
      { name: 'lastCallTs', type: 'uint256' }, { name: 'capPerSwap', type: 'uint256' }, { name: 'interval', type: 'uint256' },
      { name: 'incentiveFee', type: 'uint256' }, { name: 'burnProxy', type: 'address' }, { name: 'burnPercentage', type: 'uint256' },
      { name: 'priceTwa', type: 'uint32' }, { name: 'slippage', type: 'uint256' }, { name: 'path', type: 'bytes' },
      { name: 'paused', type: 'bool' }, { name: 'disabled', type: 'bool' }, { name: 'balance', type: 'uint256' },
      { name: 'nextToBuy', type: 'uint256' }, { name: 'nextToBurn', type: 'uint256' }, { name: 'nextIncentiveFee', type: 'uint256' },
      { name: 'nextCall', type: 'uint256' },
    ] }],
  },
]);
const farmKeeperAbi = new Interface([
  {
    inputs: [], name: 'farmViews', stateMutability: 'view', type: 'function',
    outputs: [{ type: 'tuple[]', name: '', components: [
      { name: 'id', type: 'address' },
      { name: 'poolKey', type: 'tuple', components: [{ name: 'token0', type: 'address' }, { name: 'token1', type: 'address' }, { name: 'fee', type: 'uint24' }] },
      { name: 'lp', type: 'tuple', components: [{ name: 'tokenId', type: 'uint256' }, { name: 'liquidity', type: 'uint128' }] },
      { name: 'allocPoints', type: 'uint256' }, { name: 'lastRewardTime', type: 'uint256' },
      { name: 'accIncentiveTokenPerShare', type: 'uint256' }, { name: 'accFeePerShareForToken0', type: 'uint256' },
      { name: 'accFeePerShareForToken1', type: 'uint256' }, { name: 'protocolFee', type: 'uint256' },
      { name: 'priceTwa', type: 'uint32' }, { name: 'slippage', type: 'uint256' },
      { name: 'balanceToken0', type: 'uint256' }, { name: 'balanceToken1', type: 'uint256' },
    ] }],
  },
]);
const erc20Abi = new Interface([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
]);

// WETH is shown as ETH, the way the farm's own UI and the docs name it
const SYMBOLS = { '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ETH', [TINC.toLowerCase()]: 'TINC' };
const DECIMALS = {};

// token units from wei, exact to six decimals
const units = (wei, decimals) => Number(wei / 10n ** BigInt(Math.max(0, decimals - 6))) / 1e6;

async function fetchProtocolFacts(callRPC, previous, totalSupply, lastProcessedBlock) {
  const call = async (to, iface, fn, args = []) => {
    const data = iface.encodeFunctionData(fn, args);
    const raw = await callRPC('eth_call', [{ to, data }, 'latest']);
    return iface.decodeFunctionResult(fn, raw);
  };
  const symbolOf = async (address) => {
    const key = address.toLowerCase();
    if (SYMBOLS[key]) return SYMBOLS[key];
    try {
      SYMBOLS[key] = (await call(address, erc20Abi, 'symbol'))[0];
    } catch (error) {
      SYMBOLS[key] = `${address.slice(0, 6)}…${address.slice(-4)}`;
    }
    return SYMBOLS[key];
  };
  const decimalsOf = async (address) => {
    const key = address.toLowerCase();
    if (DECIMALS[key] !== undefined) return DECIMALS[key];
    try {
      DECIMALS[key] = Number((await call(address, erc20Abi, 'decimals'))[0]);
    } catch (error) {
      DECIMALS[key] = 18;
    }
    return DECIMALS[key];
  };
  const p = previous || {};

  let facts;
  try {
    // Input tokens: what the buy-and-burn processes today, and how it is set for each
    const tokens = (await call(BUY_AND_BURN, buyAndBurnAbi, 'inputTokens'))[0];
    const active = [];
    const paused = [];
    const settings = [];
    const inputTokens = new Set();
    for (const token of tokens) {
      if (token.disabled) continue;
      inputTokens.add(token.id.toLowerCase());
      const symbol = await symbolOf(token.id);
      (token.paused ? paused : active).push(symbol);
      const burned = Number(token.burnPercentage) / 100;
      settings.push({
        token: symbol,
        address: token.id.toLowerCase(),
        state: token.paused ? 'paused' : 'active',
        callerCutPercent: Number(token.incentiveFee) / 100,
        burnedAsItselfPercent: burned,
        swappedPercent: 100 - burned,
        waiting: units(BigInt(token.balance), await decimalsOf(token.id)),
      });
    }

    // Farms: which pools hold TINC (either side of the pair), and the protocol fee on the farms whose
    // fees can reach the buy-and-burn (emission and at least one input token; the pegged keeper's
    // synthetic root farm has neither trading nor an input token, so its 0% is not a fee)
    const farms = (await call(FARM_KEEPER, farmKeeperAbi, 'farmViews'))[0];
    const tincPools = [];
    let feeMaxBasisPoints = 0;
    let feeMinBasisPoints = null;
    for (const farm of farms) {
      const token0 = farm.poolKey.token0;
      const token1 = farm.poolKey.token1;
      if (token0.toLowerCase() === TINC.toLowerCase() || token1.toLowerCase() === TINC.toLowerCase()) {
        tincPools.push({ address: farm.id.toLowerCase(), pair: `${await symbolOf(token0)}/${await symbolOf(token1)}` });
      }
      if (Number(farm.allocPoints) > 0 && (inputTokens.has(token0.toLowerCase()) || inputTokens.has(token1.toLowerCase()))) {
        const fee = Number(farm.protocolFee);
        feeMaxBasisPoints = Math.max(feeMaxBasisPoints, fee);
        feeMinBasisPoints = feeMinBasisPoints === null ? fee : Math.min(feeMinBasisPoints, fee);
      }
    }

    // Pools: how much of the supply sits in those positions
    let poolTinc = 0;
    for (const pool of tincPools) {
      poolTinc += Number((await call(TINC, erc20Abi, 'balanceOf', [pool.address]))[0]) / 1e18;
    }
    const poolShare = totalSupply > 0 ? poolTinc / totalSupply : null;
    // TINC last: it is the token itself, not an input in the reader's sense
    const activeOrdered = [...active.filter((s) => s !== 'TINC'), ...active.filter((s) => s === 'TINC')];
    const order = [...activeOrdered, ...paused];
    settings.sort((a, b) => order.indexOf(a.token) - order.indexOf(b.token));

    // Hand the pools to the holder pipeline (it excludes them from the ranks on its next run)
    try {
      fs.mkdirSync(path.dirname(POOLS_FILE), { recursive: true });
      fs.writeFileSync(POOLS_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), pools: tincPools }, null, 2));
    } catch (error) {
      console.warn(`⚠️ Could not write ${POOLS_FILE}: ${error.message}`);
    }

    console.log(`🏛️ Protocol facts: ${tincPools.length} TINC pools (${tincPools.map((p) => p.pair).join(', ')}) hold ${(poolShare * 100).toFixed(1)}% of supply · active inputs ${activeOrdered.join(', ')} · paused ${paused.join(', ')} · protocol fee ${feeMinBasisPoints === feeMaxBasisPoints ? feeMaxBasisPoints / 100 : `${feeMinBasisPoints / 100}-${feeMaxBasisPoints / 100}`}%`);
    facts = {
      tincPools,
      poolShare,
      activeInputTokens: activeOrdered,
      pausedInputTokens: paused,
      protocolFeeMaxPercent: feeMaxBasisPoints / 100,
      protocolFeeMinPercent: (feeMinBasisPoints === null ? feeMaxBasisPoints : feeMinBasisPoints) / 100,
      buyAndBurnSettings: settings,
      protocolFactsAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`⚠️ Protocol facts unavailable (${error.message}) - keeping previous values`);
    facts = {
      tincPools: p.tincPools ?? [],
      poolShare: p.poolShare ?? null,
      activeInputTokens: p.activeInputTokens ?? [],
      pausedInputTokens: p.pausedInputTokens ?? [],
      protocolFeeMaxPercent: p.protocolFeeMaxPercent ?? null,
      protocolFeeMinPercent: p.protocolFeeMinPercent ?? null,
      buyAndBurnSettings: p.buyAndBurnSettings ?? [],
      protocolFactsAt: p.protocolFactsAt ?? null,
      protocolFactsStale: true,
    };
  }

  // The fee collected since launch, from the keepers' events (its own cache; kept on failure)
  try {
    facts.protocolFeeCollected = await updateProtocolFee(callRPC, lastProcessedBlock, symbolOf, decimalsOf);
    const c = facts.protocolFeeCollected;
    console.log(`🏛️ Protocol fee collected: ${c.transactions} transactions, ${c.totals.length} tokens, last ${c.lastCollectedAt} by ${c.lastCollectedBy}, scanned to ${c.scannedToBlock}`);
  } catch (error) {
    console.warn(`⚠️ Protocol-fee collections unavailable (${error.message}) - keeping previous values`);
    facts.protocolFeeCollected = p.protocolFeeCollected ?? null;
    facts.protocolFeeCollectedStale = true;
  }
  return facts;
}

module.exports = { fetchProtocolFacts, POOLS_FILE };
