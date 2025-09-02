# TINC Burn Scanner Fix Proposal
**Date**: September 2, 2025  
**Status**: AWAITING APPROVAL  
**Critical**: 27,207 TINC currently missing from production

## Problem Summary
The scanner is losing burns due to:
1. **30-day window drops old data** - When window shifts, historical burns are deleted
2. **Failed chunks never retried** - Blocks that fail to fetch are skipped forever
3. **No validation** - Total can decrease without any warnings

## Proposed Fixes

### OPTION 1: Immediate Hotfix (1 hour implementation)
**Purpose**: Stop data loss immediately while we work on permanent solution

#### Changes to `/scripts/incremental-burn-manager.js`:
```javascript
// Line 203: CHANGE THIS
const totalBurned = result.reduce((sum, day) => sum + day.amountTinc, 0);

// TO THIS (preserve historical total)
const newWindowTotal = result.reduce((sum, day) => sum + day.amountTinc, 0);
const totalBurned = Math.max(
  existingData.totalBurned || 0,  // Never go below existing
  newWindowTotal
);
```

#### Add validation to `/scripts/fetch-burn-data.js`:
```javascript
// Add after line 900 (before saving)
function validateBeforeSave(newData, existingData) {
  // CRITICAL: Never allow total to decrease
  if (newData.totalBurned < existingData.totalBurned) {
    console.error(`❌ DATA REGRESSION BLOCKED!`);
    console.error(`   Old: ${existingData.totalBurned}`);
    console.error(`   New: ${newData.totalBurned}`);
    console.error(`   Difference: ${existingData.totalBurned - newData.totalBurned}`);
    
    // Keep the higher total
    newData.totalBurned = existingData.totalBurned;
    newData.regressionPrevented = true;
  }
  return newData;
}
```

#### Add failed chunk persistence:
```javascript
// Store failed chunks for retry
const FAILED_CHUNKS_FILE = './data/failed-chunks.json';

function saveFailedChunks(chunks) {
  fs.writeFileSync(FAILED_CHUNKS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    chunks: chunks
  }, null, 2));
}

// On startup, check for failed chunks
function loadFailedChunks() {
  if (fs.existsSync(FAILED_CHUNKS_FILE)) {
    return JSON.parse(fs.readFileSync(FAILED_CHUNKS_FILE));
  }
  return null;
}
```

**Pros**: 
- Prevents further data loss immediately
- Simple to implement and test
- Backward compatible

**Cons**: 
- Doesn't recover missing burns
- Band-aid solution

---

### OPTION 2: Recovery + Fix (3 hour implementation)
**Purpose**: Recover missing burns AND prevent future loss

#### Step 1: Create recovery script
```javascript
// scripts/recover-missing-burns.js
async function recoverMissingBurns() {
  // 1. Load current data
  const currentData = loadProductionData();
  
  // 2. Fetch last 35 days from blockchain (safety margin)
  const blockchainBurns = await fetchFromBlockchain(35);
  
  // 3. Find missing transactions
  const missing = findMissingTransactions(currentData, blockchainBurns);
  
  // 4. Add missing burns to data
  missing.forEach(burn => {
    addBurnToData(currentData, burn);
  });
  
  // 5. Recalculate totals
  currentData.totalBurned = calculateTotal(currentData);
  
  // 6. Save recovered data
  saveData(currentData);
  
  return {
    recovered: missing.length,
    newTotal: currentData.totalBurned
  };
}
```

#### Step 2: Implement Option 1 fixes
All the validation and persistence from Option 1

#### Step 3: Add blockchain verification
```javascript
// Add to daily cron
async function dailyBlockchainVerification() {
  const ourTotal = getOurTotal();
  const blockchainTotal = await getBlockchainTotal();
  
  if (Math.abs(ourTotal - blockchainTotal) > 100) {
    await sendAlert(`Discrepancy: ${ourTotal} vs ${blockchainTotal}`);
    await runRecovery();
  }
}
```

**Pros**: 
- Recovers all missing burns
- Prevents future loss
- Adds verification layer

**Cons**: 
- More complex
- Requires testing

---

### OPTION 3: Complete Redesign (1 week implementation)
**Purpose**: Permanent architectural fix

#### New Data Structure:
```javascript
{
  "permanent": {
    // Never deleted, always grows
    "allTimeBurns": {
      "0x8da3d496...": { amount: 20428, block: 23060356, date: "2025-08-04" },
      // Every burn ever, indexed by hash
    },
    "totalBurnedAllTime": 1057759.00,
    "lastVerifiedBlock": 23276324
  },
  
  "display": {
    // For UI only, can be recalculated
    "last30Days": [...],
    "dailyStats": [...],
    "chartData": [...]
  },
  
  "integrity": {
    "failedBlocks": [...],
    "lastBlockchainSync": "2025-09-02T16:00:00Z",
    "dataVersion": 2
  }
}
```

#### Key Changes:
1. **Permanent storage** - Burns are NEVER deleted
2. **Transaction index** - Every burn stored by hash
3. **Separate display data** - UI data calculated from permanent storage
4. **Built-in integrity** - Failed blocks tracked and retried

**Pros**: 
- Solves problem permanently
- 100% data integrity
- Professional architecture

**Cons**: 
- Major refactor needed
- Migration required
- Testing time

---

## My Recommendation

**Implement Option 2 NOW**, then plan for Option 3:

1. **Today**: 
   - Implement Option 2 (recovery + fix)
   - Recover the 27,207 missing TINC
   - Add validation to prevent regression

2. **This Week**:
   - Monitor for any issues
   - Daily blockchain verification
   - Document all findings

3. **Next Week**:
   - Begin Option 3 implementation
   - Proper architectural redesign
   - Full testing suite

## Implementation Plan (if approved)

### For Option 2:
1. [ ] Stop auto-updates (5 min)
2. [ ] Backup all data (5 min)
3. [ ] Create recovery script (30 min)
4. [ ] Test recovery locally (20 min)
5. [ ] Run recovery on production (10 min)
6. [ ] Add validation fixes (20 min)
7. [ ] Test validation (20 min)
8. [ ] Add blockchain verification (30 min)
9. [ ] Test end-to-end (30 min)
10. [ ] Resume auto-updates (5 min)
11. [ ] Monitor for 1 hour

**Total time: ~3 hours**

## Risk Assessment

### Without Fix:
- **HIGH RISK**: Losing more burns daily
- **CURRENT**: Missing 27,207 TINC (2.5% error)
- **PROJECTION**: Could lose 1000+ TINC per day

### With Option 2:
- **LOW RISK**: Validation prevents regression
- **RECOVERY**: Get back 27,207 TINC
- **MONITORING**: Daily verification catches issues

## Approval Checklist

Please confirm:
- [ ] Approve Option 2 implementation
- [ ] Confirm 3-hour maintenance window
- [ ] Approve stopping auto-updates temporarily
- [ ] Approve data recovery from blockchain

## Next Steps

**Awaiting your approval to proceed with Option 2**

Once approved, I will:
1. Implement the recovery and fixes
2. Test thoroughly
3. Deploy to production
4. Monitor for stability
5. Report results

---

**IMPORTANT**: Every hour we wait, we risk losing more burns. The 30-day window shifts daily, potentially dropping more historical data.

Please respond with your choice:
- "Implement Option 1" - Quick hotfix only
- "Implement Option 2" - Recovery + fix (recommended)
- "Implement Option 3" - Wait for full redesign
- "Modify proposal" - Request changes