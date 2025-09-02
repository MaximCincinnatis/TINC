# Burn Scanner Audit & Verification Plan
Date: September 2, 2025

## 🚨 CRITICAL ISSUE FOUND

### Data Regression Detected
- **After fix (Sep 1)**: 1,033,796.66 TINC burned
- **Current (Sep 2)**: 1,030,551.55 TINC burned  
- **LOST**: 3,245.11 TINC

This suggests the 30-day rolling window dropped old data without proper preservation.

## Proposed Verification Methodology

### 1. Independent Blockchain Verification
Create a script that:
- Fetches ALL burns from the last 30 days directly from blockchain
- Compares with current production data
- Identifies any missing transactions

### 2. Daily Snapshot Comparison
- Compare each day's burns between:
  - Production data
  - Fresh blockchain fetch
  - Historical backups

### 3. Transaction-Level Audit
- Get all transaction hashes from production
- Verify each transaction on blockchain
- Check for:
  - Missing transactions
  - Duplicate transactions
  - Wrong amounts
  - Wrong dates

## Implementation Plan

### Step 1: Create Comprehensive Verification Script

```javascript
// verify-burns-comprehensive.js

async function verifyBurns() {
  // 1. Get current production data
  const prodData = loadProductionData();
  
  // 2. Fetch fresh from blockchain (30 days)
  const blockchainData = await fetchAllBurns(30);
  
  // 3. Compare totals
  const diff = compareData(prodData, blockchainData);
  
  // 4. Transaction-level verification
  const missing = findMissingTransactions(prodData, blockchainData);
  const extra = findExtraTransactions(prodData, blockchainData);
  
  // 5. Generate report
  return {
    prodTotal: prodData.total,
    blockchainTotal: blockchainData.total,
    difference: diff,
    missingTxs: missing,
    extraTxs: extra,
    accuracy: (prodData.total / blockchainData.total * 100)
  };
}
```

### Step 2: Etherscan Cross-Verification
Use Etherscan API as independent source:
- Query all TINC transfers to 0x0
- Compare with our data
- Provides third-party validation

### Step 3: Historical Recovery
If burns are missing:
- Check all backup files
- Merge missing transactions
- Validate against blockchain

## Verification Tests

### Test 1: Total Accuracy
```
Expected: Blockchain total
Actual: Production total
Tolerance: < 0.1%
```

### Test 2: Daily Accuracy
```
For each day:
  Expected: Blockchain daily total
  Actual: Production daily total
  Tolerance: < 1 TINC
```

### Test 3: Transaction Completeness
```
For each transaction on blockchain:
  Must exist in production data
  Amount must match exactly
  Date must be correct
```

## Quick Verification Commands

```bash
# 1. Check current totals
node -e "console.log(require('./data/burn-data.json').totalBurned)"

# 2. Run comprehensive verification
node scripts/verify-burns-comprehensive.js

# 3. Compare with Etherscan
node scripts/etherscan-verify.js --days 30

# 4. Check for missing transactions
node scripts/find-missing-burns.js
```

## Root Cause Analysis

The data loss suggests:
1. **30-day window issue**: Old data dropped when window shifts
2. **Merge logic problem**: Not preserving historical totals
3. **Possible double-counting**: Some burns might be duplicated

## Immediate Actions

1. **Restore from backup**: Use the Sep 1 backup with 1,033,796 TINC
2. **Run full verification**: Check every transaction against blockchain
3. **Fix merge logic**: Ensure historical data is preserved
4. **Add validation**: Prevent total from decreasing

## Success Criteria

- [ ] Total burns match blockchain exactly
- [ ] No missing transactions
- [ ] No duplicate transactions  
- [ ] Daily totals accurate within 1 TINC
- [ ] Validation prevents future regressions