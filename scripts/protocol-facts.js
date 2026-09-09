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
 *   protocolFeeMaxPercent the protocol fee on the farms that receive emission, in percent
 *
 * The pools are also written to data/cache/tinc-pools.json for the holder pipeline, which
 * excludes them from the ranks. Display data, like the holder stats: on any failure the
 * previous values are kept and marked stale, so a decode problem can never block a burn
 * update. RPC calls go through the caller's failfast wrapper, the same one the burn scan uses.
 */
const { Interface } = require('ethers');

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
  'function balanceOf(address owner) view returns (uint256)',
]);

// WETH is shown as ETH, the way the farm's own UI and the docs name it
const SYMBOLS = { '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ETH', [TINC.toLowerCase()]: 'TINC' };

async function fetchProtocolFacts(callRPC, previous, totalSupply) {
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

  try {
    // Farms: which pools hold TINC (either side of the pair), and the protocol fee where emission goes
    const farms = (await call(FARM_KEEPER, farmKeeperAbi, 'farmViews'))[0];
    const tincPools = [];
    let feeBasisPoints = 0;
    for (const farm of farms) {
      const token0 = farm.poolKey.token0;
      const token1 = farm.poolKey.token1;
      if (token0.toLowerCase() === TINC.toLowerCase() || token1.toLowerCase() === TINC.toLowerCase()) {
        tincPools.push({ address: farm.id.toLowerCase(), pair: `${await symbolOf(token0)}/${await symbolOf(token1)}` });
      }
      if (Number(farm.allocPoints) > 0) feeBasisPoints = Math.max(feeBasisPoints, Number(farm.protocolFee));
    }

    // Pools: how much of the supply sits in those positions
    let poolTinc = 0;
    for (const pool of tincPools) {
      poolTinc += Number((await call(TINC, erc20Abi, 'balanceOf', [pool.address]))[0]) / 1e18;
    }
    const poolShare = totalSupply > 0 ? poolTinc / totalSupply : null;

    // Input tokens: what the buy-and-burn processes today
    const tokens = (await call(BUY_AND_BURN, buyAndBurnAbi, 'inputTokens'))[0];
    const active = [];
    const paused = [];
    for (const token of tokens) {
      if (token.disabled) continue;
      (token.paused ? paused : active).push(await symbolOf(token.id));
    }
    // TINC last: it is the token itself, not an input in the reader's sense
    const activeOrdered = [...active.filter((s) => s !== 'TINC'), ...active.filter((s) => s === 'TINC')];

    // Hand the pools to the holder pipeline (it excludes them from the ranks on its next run)
    try {
      fs.mkdirSync(path.dirname(POOLS_FILE), { recursive: true });
      fs.writeFileSync(POOLS_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), pools: tincPools }, null, 2));
    } catch (error) {
      console.warn(`⚠️ Could not write ${POOLS_FILE}: ${error.message}`);
    }

    console.log(`🏛️ Protocol facts: ${tincPools.length} TINC pools (${tincPools.map((p) => p.pair).join(', ')}) hold ${(poolShare * 100).toFixed(1)}% of supply · active inputs ${activeOrdered.join(', ')} · paused ${paused.join(', ') || 'none'} · protocol fee ${feeBasisPoints / 100}%`);
    return {
      tincPools,
      poolShare,
      activeInputTokens: activeOrdered,
      pausedInputTokens: paused,
      protocolFeeMaxPercent: feeBasisPoints / 100,
      protocolFactsAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`⚠️ Protocol facts unavailable (${error.message}) - keeping previous values`);
    const p = previous || {};
    return {
      tincPools: p.tincPools ?? [],
      poolShare: p.poolShare ?? null,
      activeInputTokens: p.activeInputTokens ?? [],
      pausedInputTokens: p.pausedInputTokens ?? [],
      protocolFeeMaxPercent: p.protocolFeeMaxPercent ?? null,
      protocolFactsAt: p.protocolFactsAt ?? null,
      protocolFactsStale: true,
    };
  }
}

module.exports = { fetchProtocolFacts, POOLS_FILE };
