#!/usr/bin/env node
/**
 * Daily truth check for the TINC burn tracker (2026-09-09).
 *
 * The publish-health cron proves motion (commits land, the live file is fresh). This proves the
 * numbers: it recounts the tracker's whole window from the node and compares it with what the
 * site is serving right now, then watches the one thing the copy states as a fact about the
 * protocol's keys.
 *
 *   1. burns   Transfer(TINC -> 0x0) per UTC day: amounts, event counts and the hash list, from the
 *              window's first block to the snapshot's lastProcessedBlock (like for like).
 *   2. mints   Transfer(0x0 -> TINC) the same way (hash:logIndex), and mintedInWindow.
 *   3. totals  totalBurned = sum of days, burnPercentage = burned / supply, supplyChange = minted - burned,
 *              totalSupply equal to the chain at some block between lastProcessedBlock and the fetch.
 *   4. lag     the live snapshot's lastProcessedBlock within HEAD_LAG_BLOCKS of the node's head.
 *   5. fields  the protocol facts the page reads (pools, input tokens, fee, holders) present and fresh.
 *   6. keys    RoleGranted / RoleRevoked at the AccessManager since the last run, each holder's code
 *              size and execution delay, and FarmKeeper.authority(): any change is reported so the
 *              methodology's dated sentence about the admin key can be rewritten by hand.
 *
 * Reads the node named in .env and the live site; writes only its own state and log under
 * ~/.local/state. Alerts through ~/.local/bin/dashboard-alert.sh (Telegram ops chat + popup), the
 * same path as publish-health-check.sh. Exit 1 when anything is wrong.
 *
 * usage: node scripts/truth-check.js [--json <file>] [--no-alert] [--quiet]
 *   --json <file>   check a local snapshot instead of the live site (lab runs; alerts are labelled TEST)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { id: keccakId } = require('ethers');

const ROOT = path.join(__dirname, '..');
try { require('dotenv').config({ path: path.join(ROOT, '.env') }); } catch { /* manual parse below */ }
if (!process.env.ETH_RPC_ENDPOINT) {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^ETH_RPC_ENDPOINT=(.*)$/); if (m) process.env.ETH_RPC_ENDPOINT = m[1].trim().replace(/^"|"$/g, '');
    }
  } catch { /* no .env */ }
}
const EP = process.env.ETH_RPC_ENDPOINT;
if (!EP) { console.error('ETH_RPC_ENDPOINT not set'); process.exit(2); }

const SITE = 'https://www.tincburn.fyi';
const TINC = '0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a';
const FARM_KEEPER = '0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223';
const ACCESS_MANAGER = '0x598d291D3E8f483790EBAc729db148A88E8C3780';
const ROLE_SCAN_FLOOR = 20900000; // before the AccessManager existed (TINC's FarmKeeper era starts at 20,922,015)
const HEAD_LAG_BLOCKS = 2000; // ~6.7 h; pushes land every ~2.2 h
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ROLE_GRANTED = keccakId('RoleGranted(uint64,address,uint32,uint48,bool)');
const ROLE_REVOKED = keccakId('RoleRevoked(uint64,address)');
const SEL_HAS_ROLE = keccakId('hasRole(uint64,address)').slice(0, 10);
const SEL_AUTHORITY = keccakId('authority()').slice(0, 10);
const SEL_TOTAL_SUPPLY = '0x18160ddd';
const pad32 = (v) => v.toString(16).padStart(64, '0');
const padAddr = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0');
const ZERO_TOPIC = '0x' + pad32(0n);
const hex = (n) => '0x' + n.toString(16);
const STATE_DIR = process.env.TINC_TRUTH_STATE_DIR || path.join(os.homedir(), '.local', 'state');
const STATE_FILE = path.join(STATE_DIR, 'tinc-truth-state.json');
const LOG_FILE = path.join(STATE_DIR, 'tinc-truth.log');
const STATUS_FILE = path.join(STATE_DIR, 'tinc-truth.status');
const ALERT_SCRIPT = path.join(os.homedir(), '.local', 'bin', 'dashboard-alert.sh');

const args = process.argv.slice(2);
const argVal = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const localJson = argVal('--json');
const alertOn = !args.includes('--no-alert');
const quiet = args.includes('--quiet');
const say = (...a) => { if (!quiet) console.log(...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let rpcId = 0;
async function rpc(method, params) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(EP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }) });
      const j = await r.json();
      if (j.error) throw new Error(`${method}: ${JSON.stringify(j.error)}`);
      return j.result;
    } catch (e) { lastErr = e; await sleep(400 * attempt); }
  }
  throw lastErr;
}
const tsCache = new Map();
async function tsOf(n) {
  if (!tsCache.has(n)) tsCache.set(n, parseInt((await rpc('eth_getBlockByNumber', [hex(n), false])).timestamp, 16));
  return tsCache.get(n);
}
async function firstBlockAtOrAfter(ts, head) {
  let lo = Math.max(1, head - 400000), hi = head;
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (await tsOf(mid) < ts) lo = mid + 1; else hi = mid; }
  return lo;
}
async function getLogs(address, topics, from, to, step = 5000) {
  if (to < from) return [];
  const ranges = [];
  for (let f = from; f <= to; f += step) ranges.push([f, Math.min(f + step - 1, to)]);
  const out = [];
  for (let i = 0; i < ranges.length; i += 4) {
    const parts = await Promise.all(ranges.slice(i, i + 4).map(([f, t]) => rpc('eth_getLogs', [{ fromBlock: hex(f), toBlock: hex(t), address, topics }])));
    for (const p of parts) out.push(...p);
  }
  out.sort((a, b) => (parseInt(a.blockNumber, 16) - parseInt(b.blockNumber, 16)) || (parseInt(a.logIndex, 16) - parseInt(b.logIndex, 16)));
  return out;
}
const wei = (l) => BigInt(l.data);
const tinc = (w) => Number(w) / 1e18;
const dayOf = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function loadSnapshot() {
  if (localJson) return { json: JSON.parse(fs.readFileSync(localJson, 'utf8')), source: `local file ${path.basename(localJson)}` };
  let latest = null;
  try {
    const m = await (await fetch(`${SITE}/data/data-manifest.json?t=${Date.now()}`, { cache: 'no-store' })).json();
    if (m && typeof m.latest === 'string') latest = m.latest;
  } catch { /* fall through to the stable file */ }
  const file = latest || 'burn-data.json';
  const r = await fetch(`${SITE}/data/${file}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`live ${file}: HTTP ${r.status}`);
  return { json: await r.json(), source: `live ${file}` };
}

async function main() {
  const startedAt = Date.now();
  const problems = [];
  const notes = [];
  const { json, source } = await loadSnapshot();
  say(`snapshot: ${source} · fetchedAt ${json.fetchedAt} · window ${json.startDate}..${json.endDate} (${json.dailyBurns.length} days) · lastProcessedBlock ${json.lastProcessedBlock}`);

  // 5. fields the page reads
  for (const f of ['mintedInWindow', 'supplyChange', 'poolShare', 'tincPools', 'activeInputTokens', 'pausedInputTokens', 'protocolFeeMaxPercent', 'protocolFactsAt']) {
    if (!(f in json)) problems.push(`field ${f} missing from the snapshot`);
  }
  if (json.protocolFactsStale) problems.push('protocol facts are stale (the contract reads failed in the last cycle)');
  if (!Array.isArray(json.tincPools) || json.tincPools.length === 0) problems.push('tincPools is empty');
  if (!Array.isArray(json.activeInputTokens) || json.activeInputTokens.length === 0) problems.push('activeInputTokens is empty');
  if (!(json.holderStats && json.holderStats.totalHolders > 0)) problems.push('holderStats.totalHolders is missing or zero');
  if ('mergeNote' in json) problems.push('mergeNote is back in the snapshot');
  if (!json.dailyBurns.every((d) => typeof d.mintedTinc === 'number' && Array.isArray(d.mintEvents))) problems.push('a day lacks its mint fields');

  // 3a. arithmetic inside the snapshot
  const sumBurned = json.dailyBurns.reduce((s, d) => s + d.amountTinc, 0);
  const sumMinted = json.dailyBurns.reduce((s, d) => s + (d.mintedTinc || 0), 0);
  if (Math.abs(sumBurned - json.totalBurned) > 1e-6) problems.push(`totalBurned ${json.totalBurned} is not the sum of the days ${sumBurned}`);
  if (Math.abs(json.burnPercentage - json.totalBurned / json.totalSupply * 100) > 1e-9) problems.push(`burnPercentage ${json.burnPercentage} is not burned / supply (${json.totalBurned / json.totalSupply * 100})`);
  if (typeof json.mintedInWindow === 'number' && Math.abs(sumMinted - json.mintedInWindow) > 1e-6) problems.push(`mintedInWindow ${json.mintedInWindow} is not the sum of the days ${sumMinted}`);
  if (typeof json.supplyChange === 'number' && Math.abs(json.supplyChange - (json.mintedInWindow - json.totalBurned)) > 1e-6) problems.push('supplyChange is not minted - burned');

  const head = parseInt(await rpc('eth_blockNumber', []), 16);
  const endBlock = json.lastProcessedBlock;
  if (!Number.isInteger(endBlock) || endBlock <= 0 || endBlock > head) {
    problems.push(`lastProcessedBlock ${endBlock} is not a block at or below the head ${head}`);
  } else {
    // 4. lag
    if (head - endBlock > HEAD_LAG_BLOCKS) problems.push(`live snapshot is ${head - endBlock} blocks behind the head (limit ${HEAD_LAG_BLOCKS})`);

    // 1 + 2. recount the window from the node
    const startTs = Math.floor(Date.parse(json.startDate + 'T00:00:00Z') / 1000);
    const startBlock = await firstBlockAtOrAfter(startTs, head);
    const burnLogs = await getLogs(TINC, [TRANSFER, null, ZERO_TOPIC], startBlock, endBlock);
    const mintLogs = await getLogs(TINC, [TRANSFER, ZERO_TOPIC], startBlock, endBlock);
    const blocks = [...new Set([...burnLogs, ...mintLogs].map((l) => parseInt(l.blockNumber, 16)))];
    for (let i = 0; i < blocks.length; i += 8) await Promise.all(blocks.slice(i, i + 8).map(tsOf));
    const chainDays = new Map();
    const dayRec = (date) => { if (!chainDays.has(date)) chainDays.set(date, { burned: 0n, burns: [], minted: 0n, mints: [] }); return chainDays.get(date); };
    for (const l of burnLogs) { const d = dayRec(dayOf(tsCache.get(parseInt(l.blockNumber, 16)))); d.burned += wei(l); d.burns.push(l.transactionHash.toLowerCase()); }
    for (const l of mintLogs) { const d = dayRec(dayOf(tsCache.get(parseInt(l.blockNumber, 16)))); d.minted += wei(l); d.mints.push(`${l.transactionHash.toLowerCase()}:${parseInt(l.logIndex, 16)}`); }
    const jsonDays = new Map(json.dailyBurns.map((d) => [d.date, d]));
    for (const [date, c] of chainDays) {
      if (!jsonDays.has(date) && (c.burns.length || c.mints.length)) problems.push(`day ${date}: ${c.burns.length} burn / ${c.mints.length} mint events on chain, no such day in the snapshot`);
    }
    let dayMismatches = 0;
    for (const d of json.dailyBurns) {
      const c = chainDays.get(d.date) || { burned: 0n, burns: [], minted: 0n, mints: [] };
      const issues = [];
      if (Math.abs(tinc(c.burned) - d.amountTinc) > 1e-6) issues.push(`burned ${d.amountTinc.toFixed(6)} vs chain ${tinc(c.burned).toFixed(6)}`);
      if (c.burns.length !== d.transactionCount) issues.push(`${d.transactionCount} burn events vs chain ${c.burns.length}`);
      const jh = d.transactions.map((t) => t.hash.toLowerCase()).sort(); const ch = [...c.burns].sort();
      if (jh.join() !== ch.join()) {
        const missing = ch.filter((h) => !jh.includes(h)); const extra = jh.filter((h) => !ch.includes(h));
        issues.push(`burn hashes differ (${missing.length} on chain only${missing[0] ? ' e.g. ' + short(missing[0]) : ''}, ${extra.length} in the snapshot only${extra[0] ? ' e.g. ' + short(extra[0]) : ''})`);
      }
      if (Math.abs(tinc(c.minted) - (d.mintedTinc || 0)) > 1e-6) issues.push(`minted ${(d.mintedTinc || 0).toFixed(6)} vs chain ${tinc(c.minted).toFixed(6)}`);
      const jm = (d.mintEvents || []).map((m) => `${m.hash.toLowerCase()}:${m.index}`).sort(); const cm = [...c.mints].sort();
      if (jm.join() !== cm.join()) issues.push(`mint events differ (snapshot ${jm.length}, chain ${cm.length})`);
      if (issues.length) { dayMismatches++; problems.push(`day ${d.date}: ${issues.join('; ')}`); }
    }
    const chainBurnTotal = [...chainDays.values()].reduce((s, c) => s + c.burned, 0n);
    const chainMintTotal = [...chainDays.values()].reduce((s, c) => s + c.minted, 0n);
    const distinctTx = new Set(burnLogs.map((l) => l.transactionHash)).size;
    notes.push(`burns ${burnLogs.length} events / ${distinctTx} txs / ${tinc(chainBurnTotal).toFixed(3)} TINC and mints ${mintLogs.length} events / ${tinc(chainMintTotal).toFixed(3)} TINC over ${json.dailyBurns.length} days from block ${startBlock} to ${endBlock}${dayMismatches ? `, ${dayMismatches} days differ` : ', every day identical'}`);

    // 3b. totalSupply against the chain: the snapshot read it at fetch time, a few blocks past
    // lastProcessedBlock, so accept the supply at any block between the two.
    const supplyHead = BigInt(await rpc('eth_call', [{ to: TINC, data: SEL_TOTAL_SUPPLY }, hex(head)]));
    const afterBurns = await getLogs(TINC, [TRANSFER, null, ZERO_TOPIC], endBlock + 1, head);
    const afterMints = await getLogs(TINC, [TRANSFER, ZERO_TOPIC], endBlock + 1, head);
    const after = [...afterBurns.map((l) => ({ l, delta: -wei(l) })), ...afterMints.map((l) => ({ l, delta: wei(l) }))]
      .sort((a, b) => (parseInt(a.l.blockNumber, 16) - parseInt(b.l.blockNumber, 16)) || (parseInt(a.l.logIndex, 16) - parseInt(b.l.logIndex, 16)));
    const netAfter = after.reduce((s, e) => s + e.delta, 0n);
    let s = supplyHead - netAfter; // supply at lastProcessedBlock
    const candidates = [s];
    for (const e of after) { s += e.delta; candidates.push(s); }
    const supplyOk = candidates.some((c) => Math.abs(tinc(c) - json.totalSupply) < 1e-6);
    if (!supplyOk) problems.push(`totalSupply ${json.totalSupply} matches no block between ${endBlock} and ${head} (chain ${tinc(candidates[0]).toFixed(6)} at ${endBlock}, ${tinc(supplyHead).toFixed(6)} at the head)`);
    notes.push(`totalSupply ${json.totalSupply.toFixed(3)} ${supplyOk ? 'matches the chain' : 'DOES NOT match'}; head ${head}, snapshot ${head - endBlock} blocks behind`);
  }

  // 6. admin keys
  let state = null;
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }
  const holders = state && state.holders ? JSON.parse(JSON.stringify(state.holders)) : {};
  const from = state && Number.isInteger(state.rolesCheckedTo) ? state.rolesCheckedTo + 1 : ROLE_SCAN_FLOOR;
  const roleLogs = await getLogs(ACCESS_MANAGER, [[ROLE_GRANTED, ROLE_REVOKED]], from, head, 20000);
  const roleChanges = [];
  for (const l of roleLogs) {
    const roleId = BigInt(l.topics[1]).toString();
    const account = ('0x' + l.topics[2].slice(26)).toLowerCase();
    holders[roleId] = holders[roleId] || {};
    if (l.topics[0] === ROLE_GRANTED) {
      const delay = parseInt(l.data.slice(2, 66), 16); const newMember = parseInt(l.data.slice(130, 194), 16) === 1;
      holders[roleId][account] = { ...(holders[roleId][account] || {}), delay };
      roleChanges.push(`block ${parseInt(l.blockNumber, 16)}: role ${roleId} ${newMember ? 'granted to' : 'delay changed for'} ${short(account)} (delay ${delay})`);
    } else {
      delete holders[roleId][account];
      roleChanges.push(`block ${parseInt(l.blockNumber, 16)}: role ${roleId} revoked from ${short(account)}`);
    }
  }
  for (const roleId of Object.keys(holders)) {
    for (const account of Object.keys(holders[roleId])) {
      const res = await rpc('eth_call', [{ to: ACCESS_MANAGER, data: SEL_HAS_ROLE + pad32(BigInt(roleId)) + padAddr(account) }, 'latest']);
      const isMember = parseInt(res.slice(2, 66), 16) === 1; const delay = parseInt(res.slice(66, 130), 16);
      const code = await rpc('eth_getCode', [account, 'latest']);
      const rec = { isMember, delay, kind: code && code !== '0x' ? 'contract' : 'EOA' };
      if (!isMember) problems.push(`role ${roleId}: ${short(account)} no longer holds it and no RoleRevoked was seen`);
      holders[roleId][account] = rec;
    }
  }
  const authority = ('0x' + (await rpc('eth_call', [{ to: FARM_KEEPER, data: SEL_AUTHORITY }, 'latest'])).slice(26)).toLowerCase();
  if (authority !== ACCESS_MANAGER.toLowerCase()) problems.push(`FarmKeeper.authority() is ${authority}, not the AccessManager ${ACCESS_MANAGER.toLowerCase()}`);
  const describe = (h) => Object.keys(h).sort((a, b) => Number(a) - Number(b)).map((r) => `role ${r} → ${Object.entries(h[r]).map(([a, v]) => `${short(a)} (${v.kind}, delay ${v.delay})`).join(', ') || 'nobody'}`).join('; ');
  if (state && state.holders) {
    const before = JSON.stringify(state.holders, Object.keys(state.holders).sort()); const now = JSON.stringify(holders, Object.keys(holders).sort());
    if (roleChanges.length || before !== now) problems.push(`admin keys changed: ${roleChanges.join('; ') || 'holder kind or delay changed'} — now ${describe(holders)}; the methodology's admin-key sentence needs a fresh reading`);
    else notes.push(`admin keys unchanged: ${describe(holders)}`);
  } else {
    notes.push(`admin-key baseline recorded from ${roleLogs.length} role events: ${describe(holders)}; authority ${short(authority)}`);
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ rolesCheckedTo: head, holders, authority, checkedAt: new Date().toISOString() }, null, 2));

  // report
  const ts = new Date().toISOString();
  const took = ((Date.now() - startedAt) / 1000).toFixed(0);
  const summary = problems.length
    ? `ALERT — ${problems.length} problem${problems.length === 1 ? '' : 's'} (${source}): ${problems.join(' | ')}`
    : `OK — ${notes.join(' · ')}`;
  fs.appendFileSync(LOG_FILE, `${ts} ${summary} (${took}s)\n`);
  fs.writeFileSync(STATUS_FILE, `${problems.length ? 'ALERT' : 'OK'} ${ts}\n${summary}\n`);
  for (const n of notes) say(`  note  ${n}`);
  for (const p of problems) say(`  PROBLEM ${p}`);
  say(`${problems.length ? 'ALERT' : 'OK'} in ${took}s`);
  if (problems.length && alertOn && fs.existsSync(ALERT_SCRIPT)) {
    const label = localJson ? 'TEST RUN against a local file — ' : '';
    const text = `${label}${problems.length} problem${problems.length === 1 ? '' : 's'}: ${problems.join(' | ')}`.slice(0, 900);
    await new Promise((resolve) => execFile(ALERT_SCRIPT, ['TINC truth check', text], { timeout: 40000 }, (err) => { if (err) say(`  alert script failed: ${err.message}`); resolve(); }));
  }
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  const ts = new Date().toISOString();
  try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.appendFileSync(LOG_FILE, `${ts} ERROR — ${e.message}\n`); fs.writeFileSync(STATUS_FILE, `ERROR ${ts}\n${e.message}\n`); } catch { /* nothing to do */ }
  console.error(`truth check failed: ${e.message}`);
  if (alertOn && fs.existsSync(ALERT_SCRIPT)) {
    execFile(ALERT_SCRIPT, ['TINC truth check', `could not run: ${e.message}`.slice(0, 900)], { timeout: 40000 }, () => process.exit(2));
  } else process.exit(2);
});
