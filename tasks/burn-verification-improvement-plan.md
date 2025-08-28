# Burn Data Verification Improvement Plan

## Problem Identified
Our current system is missing burn transactions (6,713.75 TINC on Aug 8). The root causes:

1. **No post-fetch verification** - We don't verify fetched data against expected totals
2. **Silent chunk failures** - If a chunk fails after retries, we continue without it
3. **No cross-validation** - We don't compare with alternative data sources
4. **No integrity checks** - Missing transactions go undetected

## Current Weaknesses

### 1. Chunk Processing Issues
```javascript
// Current: Continues even if chunks fail
for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const burns = await fetchBurnsWithRetry(fromBlock, toBlock);
    allBurns.push(...burns); // Silent failure if burns is empty
}
```

### 2. No Transaction Count Verification
- We don't track expected vs actual transaction counts
- Missing transactions aren't detected

### 3. Limited Validation
```javascript
// Current validation only checks array length
if (allDays.length !== 30) {
    throw new Error(`Expected 30 daily entries`);
}
// But doesn't verify transaction completeness
```

## Proposed Solution

### Step 1: Add Verification Helper
Create `scripts/verify-burn-integrity.js`:
```javascript
// Verify burn data integrity
async function verifyBurnIntegrity(burnData, dateRange) {
    const issues = [];
    
    // 1. Check for transaction gaps
    for (const day of burnData.dailyBurns) {
        if (day.transactions.length !== day.transactionCount) {
            issues.push(`Mismatch on ${day.date}: ${day.transactions.length} txns vs ${day.transactionCount} count`);
        }
    }
    
    // 2. Cross-check with Etherscan
    const etherscanTotal = await fetchEtherscanBurnTotal(dateRange);
    const ourTotal = burnData.totalBurned;
    if (Math.abs(etherscanTotal - ourTotal) > 0.01) {
        issues.push(`Total mismatch: Our ${ourTotal} vs Etherscan ${etherscanTotal}`);
    }
    
    return issues;
}
```

### Step 2: Enhanced Retry with Verification
```javascript
async function fetchBurnsWithVerification(fromBlock, toBlock, expectedCount = null) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const burns = await fetchBurns(fromBlock, toBlock);
            
            // Verify if we have expected count
            if (expectedCount && burns.length < expectedCount * 0.9) {
                throw new Error(`Got ${burns.length} burns, expected ~${expectedCount}`);
            }
            
            return burns;
        } catch (error) {
            if (attempt === maxRetries) {
                // Log failed chunk for manual review
                fs.appendFileSync('failed-chunks.log', 
                    `${new Date().toISOString()}: Blocks ${fromBlock}-${toBlock} failed\n`);
                throw error;
            }
            await new Promise(r => setTimeout(r, 2000 * attempt));
        }
    }
}
```

### Step 3: Add Post-Fetch Validation
```javascript
async function validateFetchedData(burnData) {
    console.log('🔍 Validating fetched data...');
    
    // 1. Check for suspicious patterns
    const zeroDays = burnData.dailyBurns.filter(d => d.amountTinc === 0).length;
    if (zeroDays > 5) {
        console.warn(`⚠️ Warning: ${zeroDays} days with zero burns - unusual`);
    }
    
    // 2. Verify transaction continuity
    const txHashes = new Set();
    let duplicates = 0;
    
    for (const day of burnData.dailyBurns) {
        for (const tx of day.transactions) {
            if (txHashes.has(tx.hash)) {
                duplicates++;
            }
            txHashes.add(tx.hash);
        }
    }
    
    if (duplicates > 0) {
        throw new Error(`Found ${duplicates} duplicate transactions`);
    }
    
    // 3. Cross-reference with backup if available
    if (fs.existsSync('./data/burn-data.backup.json')) {
        const backup = JSON.parse(fs.readFileSync('./data/burn-data.backup.json'));
        // Compare overlapping dates
        for (const day of burnData.dailyBurns) {
            const backupDay = backup.dailyBurns.find(d => d.date === day.date);
            if (backupDay && Math.abs(day.amountTinc - backupDay.amountTinc) > 100) {
                console.warn(`⚠️ Large difference on ${day.date}: ${day.amountTinc} vs backup ${backupDay.amountTinc}`);
            }
        }
    }
    
    return true;
}
```

### Step 4: Add Recovery Mechanism
```javascript
async function recoverMissingBurns(burnData) {
    const failedChunksLog = './failed-chunks.log';
    
    if (fs.existsSync(failedChunksLog)) {
        console.log('🔄 Attempting to recover failed chunks...');
        const failedChunks = fs.readFileSync(failedChunksLog, 'utf8').split('\n');
        
        for (const line of failedChunks) {
            if (!line) continue;
            const match = line.match(/Blocks (\d+)-(\d+)/);
            if (match) {
                const [_, fromBlock, toBlock] = match;
                try {
                    console.log(`  Retrying blocks ${fromBlock}-${toBlock}...`);
                    const burns = await fetchBurnsWithVerification(
                        parseInt(fromBlock), 
                        parseInt(toBlock)
                    );
                    // Merge recovered burns
                    mergeBurnsIntoData(burnData, burns);
                } catch (error) {
                    console.error(`  Failed to recover ${fromBlock}-${toBlock}`);
                }
            }
        }
    }
}
```

### Step 5: Simple Implementation Steps

1. **Add verification check after each fetch**
```javascript
// In fetch-burn-data.js, after fetching all burns:
const issues = await verifyBurnIntegrity(burnData, { startDate, endDate });
if (issues.length > 0) {
    console.warn('⚠️ Data integrity issues found:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
}
```

2. **Track fetch success rate**
```javascript
let successfulChunks = 0;
let failedChunks = 0;

// After each chunk:
if (burns.length > 0) successfulChunks++;
else failedChunks++;

// At end:
console.log(`✅ Success rate: ${successfulChunks}/${totalChunks} chunks`);
if (failedChunks > 0) {
    console.warn(`⚠️ Failed chunks: ${failedChunks} - may be missing data`);
}
```

3. **Add simple comparison with previous run**
```javascript
if (previousData) {
    const overlap = findOverlappingDates(previousData, newData);
    for (const date of overlap) {
        const prev = previousData.dailyBurns.find(d => d.date === date);
        const curr = newData.dailyBurns.find(d => d.date === date);
        if (Math.abs(prev.amountTinc - curr.amountTinc) > 0.01) {
            console.warn(`Data changed for ${date}: ${prev.amountTinc} → ${curr.amountTinc}`);
        }
    }
}
```

## Implementation Priority (Following CLAUDE.md)

### Phase 1: Simple Validation (Immediate)
- Add transaction count validation
- Log failed chunks
- Compare with previous data

### Phase 2: Recovery Mechanism (Next Update)
- Implement failed chunk recovery
- Add Etherscan cross-check

### Phase 3: Full Integrity System (Future)
- Complete verification framework
- Automated discrepancy resolution

## Expected Outcome
- **Detect** missing transactions immediately
- **Log** problematic chunks for investigation  
- **Recover** from transient RPC failures
- **Validate** data consistency across runs
- **Alert** on significant discrepancies

This approach maintains simplicity while adding crucial verification layers to prevent missing burn data.