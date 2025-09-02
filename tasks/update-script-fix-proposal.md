# Update Script Fix Proposal
Date: September 1, 2025

## Problem Summary
The incremental update script (`fetch-burn-data.js`) has a critical flaw: it only fetches blocks AFTER `lastProcessedBlock` and never revisits failed/skipped blocks. This caused us to miss 43,141 TINC in burns.

## Root Cause
```javascript
// Line 604 - The problematic logic:
const startBlock = lastProcessedBlock > 0 ? lastProcessedBlock + 1 : currentBlock - 7200 * 30;
```

When chunks fail (lines 632-635), they're logged but never retried, and `lastProcessedBlock` still advances.

## Proposed Solution

### Short-term Fix: Add Validation & Retry Logic

Create `scripts/fetch-burn-data-fixed.js`:

```javascript
async function runIncrementalUpdate() {
  // ... existing code ...
  
  // NEW: Track failed chunks properly
  const failedChunks = [];
  
  // Process chunks
  for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    try {
      const burns = await fetchBurnsWithRetry(fromBlock, toBlock);
      allBurns.push(...burns);
    } catch (error) {
      failedChunks.push({ fromBlock, toBlock, error: error.message });
    }
  }
  
  // NEW: Retry failed chunks with smaller size
  if (failedChunks.length > 0) {
    console.log(`🔄 Retrying ${failedChunks.length} failed chunks with smaller size...`);
    
    for (const chunk of failedChunks) {
      const smallChunkSize = 100; // Much smaller for problematic ranges
      
      for (let block = chunk.fromBlock; block <= chunk.toBlock; block += smallChunkSize) {
        const endBlock = Math.min(block + smallChunkSize - 1, chunk.toBlock);
        
        try {
          const burns = await fetchBurnsWithRetry(block, endBlock, 5); // More retries
          allBurns.push(...burns);
          console.log(`✅ Recovered chunk ${block}-${endBlock}: ${burns.length} burns`);
        } catch (error) {
          console.error(`❌ CRITICAL: Unable to fetch ${block}-${endBlock} after retries`);
          // Store in permanent failure log for manual recovery
          logPermanentFailure(block, endBlock, error);
        }
      }
    }
  }
  
  // NEW: Validation against expected blocks
  const expectedBlocksCovered = currentBlock - startBlock + 1;
  if (allBurns.length === 0 && expectedBlocksCovered > 1000) {
    console.warn('⚠️ WARNING: No burns found in large block range - possible issue!');
  }
  
  // ... continue with existing merge logic ...
}

// NEW: Add validation after each update
async function validateBurnData(data) {
  // Random sampling validation
  const sampleDays = data.dailyBurns.slice(-3); // Last 3 days
  
  for (const day of sampleDays) {
    // Fetch fresh from blockchain for this day
    const freshBurns = await fetchBurnsForDate(day.date);
    
    if (Math.abs(freshBurns.total - day.amountTinc) > 1) {
      console.error(`❌ Validation failed for ${day.date}`);
      console.error(`  Expected: ${freshBurns.total}, Got: ${day.amountTinc}`);
      return false;
    }
  }
  
  return true;
}
```

### Long-term Fix: Comprehensive Range Tracking

Replace single `lastProcessedBlock` with range tracking:

```javascript
// Instead of:
// "lastProcessedBlock": 23271281

// Use:
"blockTracking": {
  "processedRanges": [
    { "start": 23000000, "end": 23099999, "complete": true },
    { "start": 23100000, "end": 23199999, "complete": true },
    { "start": 23200000, "end": 23271281, "complete": true }
  ],
  "failedRanges": [
    { "start": 23236679, "end": 23236700, "attempts": 3, "lastError": "timeout" }
  ],
  "lastContinuousBlock": 23271281,
  "lastUpdateTime": "2025-09-01T22:00:00Z"
}
```

### Implementation Steps

1. **Immediate (Today)**
   - Deploy the fixed merge (✅ Already done - added 43,141 TINC)
   - Update fetch-burn-data.js with retry logic
   - Add validation after each update

2. **This Week**
   - Implement range tracking system
   - Add persistent failure log
   - Create recovery mechanism for failed ranges

3. **Next Week**
   - Add Etherscan cross-validation
   - Implement monitoring dashboard
   - Set up alerts for discrepancies

### Monitoring & Prevention

Add these checks to prevent future issues:

```javascript
// Daily validation script
async function dailyValidation() {
  const ourData = loadBurnData();
  const etherscanData = await fetchFromEtherscan(lastDay);
  
  const discrepancy = Math.abs(ourData.lastDay - etherscanData.lastDay);
  if (discrepancy > 100) { // 100 TINC tolerance
    sendAlert(`Burn data discrepancy: ${discrepancy} TINC`);
  }
}

// Add to cron:
// 0 6 * * * node scripts/daily-validation.js
```

### Testing Plan

1. **Unit Tests**
   - Test retry logic with simulated failures
   - Test range tracking with gaps
   - Test validation functions

2. **Integration Tests**
   - Run parallel verification for 1 week
   - Compare results with Etherscan daily
   - Monitor for any discrepancies

3. **Rollback Plan**
   - Keep backup of current working version
   - Maintain versioned data files
   - Document recovery procedures

## Success Metrics

- **Zero missed burns** over 30 days
- **100% validation success** rate
- **< 1 TINC discrepancy** with Etherscan
- **Automatic recovery** from RPC failures

## Risk Assessment

**Current Risk**: MEDIUM (fixed data but script still vulnerable)
**Post-Fix Risk**: LOW (with validation and retry logic)

## Approval Checklist

- [x] Missing burns recovered (43,141 TINC added)
- [x] Data validated and tested
- [ ] Update script fixed with retry logic
- [ ] Validation system implemented
- [ ] Monitoring in place
- [ ] Documentation updated

This fix ensures we never miss burns again while maintaining backward compatibility.