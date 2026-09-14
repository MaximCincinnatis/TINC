require('dotenv').config();
const fs = require('fs');
const path = require('path');
/**
 * The protocol fee, collected (2026-09-14). Every ProtocolFeesCollected event on the FarmKeeper and the
 * PeggedFarmKeeper since launch, kept in data/cache/protocol-fee.json and extended at every update from
 * the block the last pass reached (re-reading the last few blocks, like the burn scan). Published as
 *
 *   protocolFeeCollected.totals[]          amount collected per token since launch, in token units
 *   protocolFeeCollected.transactions      number of collection transactions
 *   protocolFeeCollected.events            number of collection events (one per token per transaction)
 *   protocolFeeCollected.firstCollectedAt  ISO time of the first collection
 *   protocolFeeCollected.lastCollectedAt   ISO time of the last collection
 *   protocolFeeCollected.lastCollectedBy   the wallet that made the last collection
 *   protocolFeeCollected.collectionsByLast how many of the transactions that wallet made
 *   protocolFeeCollected.soleCollectorSince ISO time from which every collection was that wallet's, or null
 *   protocolFeeCollected.scannedToBlock    the block the scan reached
 *
 * Address-filtered log queries only: a few hundred events in total, so the first pass is one query per
 * 50,000 blocks and every later pass is a single query. On any failure the caller keeps the previous values.
 */
const { Interface } = require('ethers');

const FARM_KEEPER = '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223';
const PEGGED_FARM_KEEPER = '0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5';
const CACHE_FILE = path.join(__dirname, '..', 'data', 'cache', 'protocol-fee.json');
const LAUNCH_BLOCK = 20922000; // the keepers were deployed at block 20,922,015 (2024-10-08)
const REORG_DEPTH = 5; // re-read the last blocks each pass; an event the chain no longer has is dropped
const CHUNK = 50000;

const feeAbi = new Interface(['event ProtocolFeesCollected(address indexed token, uint256 amount)']);
const TOPIC = feeAbi.getEvent('ProtocolFeesCollected').topicHash;
const hex = (n) => '0x' + n.toString(16);

function loadCache() {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Array.isArray(cache.events)) return { tokens: {}, ...cache };
  } catch (error) {
    // no cache yet: the first pass scans from launch
  }
  return { scannedToBlock: null, events: [], tokens: {} };
}

async function updateProtocolFee(callRPC, headBlock, symbolOf, decimalsOf) {
  const cache = loadCache();
  const to = Number.isInteger(headBlock) && headBlock > 0 ? headBlock : parseInt(await callRPC('eth_blockNumber', []), 16) - 2;
  const from = Number.isInteger(cache.scannedToBlock) ? Math.max(LAUNCH_BLOCK, cache.scannedToBlock - REORG_DEPTH + 1) : LAUNCH_BLOCK;
  if (to >= from) {
    const seen = new Map(cache.events.map((e) => [`${e.tx}:${e.logIndex}`, e]));
    const onChain = new Set();
    for (let f = from; f <= to; f += CHUNK) {
      const t = Math.min(f + CHUNK - 1, to);
      const logs = await callRPC('eth_getLogs', [{ fromBlock: hex(f), toBlock: hex(t), address: [FARM_KEEPER, PEGGED_FARM_KEEPER], topics: [TOPIC] }]);
      for (const log of logs) {
        const key = `${log.transactionHash}:${parseInt(log.logIndex, 16)}`;
        onChain.add(key);
        if (seen.has(key)) continue;
        const parsed = feeAbi.parseLog({ topics: log.topics, data: log.data });
        const event = {
          block: parseInt(log.blockNumber, 16),
          logIndex: parseInt(log.logIndex, 16),
          tx: log.transactionHash,
          keeper: log.address.toLowerCase(),
          token: parsed.args.token.toLowerCase(),
          amount: parsed.args.amount.toString(),
        };
        seen.set(key, event);
        cache.events.push(event);
      }
    }
    // an event inside the re-read range that the chain no longer has was reorged away
    cache.events = cache.events.filter((e) => e.block < from || onChain.has(`${e.tx}:${e.logIndex}`));
    // sender and time of each collection transaction, read once
    const txInfo = new Map();
    for (const e of cache.events) {
      if (e.from && e.time) continue;
      if (!txInfo.has(e.tx)) {
        const tx = await callRPC('eth_getTransactionByHash', [e.tx]);
        const block = await callRPC('eth_getBlockByNumber', [hex(e.block), false]);
        txInfo.set(e.tx, { from: tx.from.toLowerCase(), time: new Date(parseInt(block.timestamp, 16) * 1000).toISOString() });
      }
      Object.assign(e, txInfo.get(e.tx));
    }
    for (const e of cache.events) {
      if (!cache.tokens[e.token]) cache.tokens[e.token] = { symbol: await symbolOf(e.token), decimals: await decimalsOf(e.token) };
    }
    cache.events.sort((a, b) => a.block - b.block || a.logIndex - b.logIndex);
    cache.scannedToBlock = to;
    cache.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  }
  return summarize(cache);
}

// token units from wei, exact to six decimals
const units = (wei, decimals) => Number(wei / 10n ** BigInt(Math.max(0, decimals - 6))) / 1e6;

function summarize(cache) {
  const sums = {};
  for (const e of cache.events) sums[e.token] = (sums[e.token] || 0n) + BigInt(e.amount);
  const totals = Object.entries(sums)
    .map(([token, wei]) => {
      const info = cache.tokens[token] || { symbol: `${token.slice(0, 6)}…${token.slice(-4)}`, decimals: 18 };
      return { token, symbol: info.symbol, decimals: info.decimals, amount: units(wei, info.decimals) };
    })
    .sort((a, b) => b.amount - a.amount);
  const events = cache.events;
  const transactions = new Set(events.map((e) => e.tx)).size;
  const first = events[0] || null;
  const last = events[events.length - 1] || null;
  let collectionsByLast = 0;
  let soleCollectorSince = null;
  if (last) {
    collectionsByLast = new Set(events.filter((e) => e.from === last.from).map((e) => e.tx)).size;
    // the first event after which every event is the last collector's
    let i = events.length;
    while (i > 0 && events[i - 1].from === last.from) i--;
    soleCollectorSince = events[i] ? events[i].time : null;
  }
  return {
    totals,
    transactions,
    events: events.length,
    firstCollectedAt: first ? first.time : null,
    lastCollectedAt: last ? last.time : null,
    lastCollectedBy: last ? last.from : null,
    collectionsByLast,
    soleCollectorSince,
    scannedToBlock: cache.scannedToBlock,
  };
}

module.exports = { updateProtocolFee, summarize, loadCache, units, CACHE_FILE, LAUNCH_BLOCK, FARM_KEEPER, PEGGED_FARM_KEEPER, TOPIC };
