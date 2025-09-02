# TINC Burn Scanner Issue Report & Proposed Solution
Date: September 1, 2025

## 🚨 CRITICAL ISSUE IDENTIFIED

The TINC burn scanner is **missing 65.4% of actual burn transactions** (52,261 TINC out of 132,182 TINC) over the last 6 days.

## Root Cause Analysis

### Primary Issue: Incremental Update Design Flaw
The scanner uses an incremental update approach with a critical flaw:

```javascript
// Line 604 in fetch-burn-data.js
const startBlock = lastProcessedBlock > 0 ? lastProcessedBlock + 1 : currentBlock - 7200 * 30;
```

**Problem**: The scanner ONLY fetches blocks AFTER `lastProcessedBlock`. If any blocks were missed or failed during previous updates, they are NEVER revisited.

### Contributing Factors:

1. **Failed Chunks Not Retried**
   - When a chunk fails (lines 632-635), it's logged but NOT retried
   - The `lastProcessedBlock` still advances to current block
   - Failed chunks create permanent gaps in data

2. **30-Day Rolling Window Issue**
   - The scanner maintains a 30-day window of burns
   - When older days drop off, their data is lost forever
   - No mechanism to backfill missing historical data

3. **Block Range Gaps**
   - Missing burns are in blocks 23236679-23263015
   - These blocks are BEFORE the current `lastProcessedBlock` (23271281)
   - Incremental updates will never go back to fetch them

## Evidence of the Problem

### Missing Transactions by Date:
- Aug 27: Missing 2 txs (-2,488 TINC)
- Aug 28: Missing amounts (-10,422 TINC) 
- Aug 29: Missing 7 txs (+21,702 TINC)
- Aug 30: Missing 5 txs (+24,143 TINC)
- Aug 31: Missing 7 txs (+10,206 TINC)
- Sep 01: ✅ Accurate (only today works)

### Pattern:
- All missing transactions are from valid burn sources
- 20 from UniversalBuyAndBurn (0x060e990...)
- 1 from direct burn (0x9fabf48e...)

## Proposed Solution

### Immediate Fix: Gap Recovery Script

Create a dedicated script to identify and backfill missing burns:

```javascript
// scripts/recover-missing-burns.js

async function recoverMissingBurns() {
  // 1. Identify gap ranges
  const gaps = await identifyGapRanges();
  
  // 2. Fetch burns for each gap
  for (const gap of gaps) {
    const burns = await fetchBurnsInRange(gap.start, gap.end);
    await mergeBurnsIntoData(burns);
  }
  
  // 3. Validate against Etherscan
  await validateWithEtherscan();
}
```

### Long-term Fix: Redesign Incremental Updates

1. **Track Processed Ranges** (Not just last block)
   ```javascript
   // Instead of just lastProcessedBlock, maintain:
   processedRanges: [
     { start: 23000000, end: 23100000 },
     { start: 23100001, end: 23200000 },
     // ... complete coverage
   ]
   ```

2. **Implement Gap Detection**
   ```javascript
   function findGaps(processedRanges, currentBlock) {
     const gaps = [];
     // Find any unprocessed ranges
     return gaps;
   }
   ```

3. **Retry Failed Chunks**
   ```javascript
   // After main scan, retry failed chunks
   for (const chunk of failedChunks) {
     const burns = await fetchBurnsWithRetry(chunk.fromBlock, chunk.toBlock);
     // Merge into results
   }
   ```

4. **Daily Validation**
   ```javascript
   // Compare with Etherscan daily
   async function validateDailyBurns() {
     const etherscanBurns = await fetchFromEtherscan();
     const ourBurns = await loadBurnData();
     const diff = compareData(etherscanBurns, ourBurns);
     if (diff > threshold) alertAdmin();
   }
   ```

## Implementation Plan

### Phase 1: Immediate Recovery (Today)
1. Run gap recovery script to fetch missing 52,261 TINC
2. Validate recovered data against Etherscan
3. Merge into production burn-data.json
4. Deploy updated data

### Phase 2: Prevent Future Issues (This Week)
1. Implement range tracking instead of single lastProcessedBlock
2. Add retry logic for failed chunks
3. Create daily validation against Etherscan
4. Add monitoring alerts for discrepancies

### Phase 3: Long-term Improvements (Next Week)
1. Redesign incremental update logic
2. Implement automatic gap detection and recovery
3. Add redundant data sources (multiple RPCs + Etherscan)
4. Create data integrity dashboard

## Risk Assessment

**Current Risk**: HIGH
- Dashboard showing incorrect burn totals
- Users seeing inaccurate deflationary metrics
- Missing 65% of actual burn activity

**Post-Fix Risk**: LOW
- Full data recovery possible
- Validation ensures accuracy
- Monitoring prevents future issues

## Approval Request

**Do you approve this recovery and fix plan?**

If approved, I will:
1. Create and run the gap recovery script
2. Validate all recovered burns
3. Update production data with complete burns
4. Implement monitoring to prevent recurrence

This will restore 100% accuracy to the burn tracker.