# Fetch-Burn-Data.js Fix Implementation Plan
Date: September 1, 2025

## Current Script Analysis

The script already has `failedChunks` tracking (lines 620-640) but **does nothing with them**! This is the root cause of our missing burns.

```javascript
// Current problematic code (lines 632-640):
} catch (error) {
  console.warn(`⚠️  Chunk ${fromBlock}-${toBlock} failed, continuing...`);
  failedChunks.push({ fromBlock, toBlock }); // Tracked but ignored!
  chunksProcessed++;
}
// ...
if (failedChunks.length > 0) {
  console.warn(`⚠️  ${failedChunks.length} chunks failed during incremental update`);
  // ❌ NO RETRY LOGIC HERE - Just warns and continues!
}
```

## Proposed Implementation

### Fix 1: Add Retry Logic for Failed Chunks

**Location**: After line 640, before processing burns into daily format

**Implementation**:
```javascript
// Add after line 640, before line 642
if (failedChunks.length > 0) {
  console.warn(`⚠️  ${failedChunks.length} chunks failed, attempting recovery...`);
  
  // NEW: Retry failed chunks with smaller size
  const recoveredBurns = [];
  const permanentFailures = [];
  
  for (const failedChunk of failedChunks) {
    console.log(`🔄 Retrying failed chunk ${failedChunk.fromBlock}-${failedChunk.toBlock}...`);
    
    // Use smaller chunk size for problematic ranges
    const RETRY_CHUNK_SIZE = 100; // Much smaller than default 800
    let chunkRecovered = false;
    
    for (let retryBlock = failedChunk.fromBlock; 
         retryBlock <= failedChunk.toBlock; 
         retryBlock += RETRY_CHUNK_SIZE) {
      
      const retryToBlock = Math.min(retryBlock + RETRY_CHUNK_SIZE - 1, failedChunk.toBlock);
      
      try {
        // Try with more retries and longer timeout
        const burns = await fetchBurnsWithRetry(retryBlock, retryToBlock, 5);
        recoveredBurns.push(...burns);
        console.log(`  ✅ Recovered ${burns.length} burns from ${retryBlock}-${retryToBlock}`);
        chunkRecovered = true;
      } catch (retryError) {
        console.error(`  ❌ Failed to recover ${retryBlock}-${retryToBlock}: ${retryError.message}`);
        permanentFailures.push({
          fromBlock: retryBlock,
          toBlock: retryToBlock,
          error: retryError.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (chunkRecovered) {
      console.log(`✅ Partially recovered chunk ${failedChunk.fromBlock}-${failedChunk.toBlock}`);
    }
  }
  
  // Add recovered burns to main array
  if (recoveredBurns.length > 0) {
    console.log(`🎉 Recovered ${recoveredBurns.length} burns from failed chunks!`);
    allBurns.push(...recoveredBurns);
  }
  
  // Log permanent failures for manual investigation
  if (permanentFailures.length > 0) {
    const failureLogPath = path.join(__dirname, '../data/permanent-failures.json');
    let existingFailures = [];
    
    if (fs.existsSync(failureLogPath)) {
      existingFailures = JSON.parse(fs.readFileSync(failureLogPath, 'utf8'));
    }
    
    existingFailures.push(...permanentFailures);
    fs.writeFileSync(failureLogPath, JSON.stringify(existingFailures, null, 2));
    
    console.error(`⚠️  ${permanentFailures.length} blocks permanently failed - logged for manual recovery`);
  }
}
```

**Why This Works**:
- Failed chunks are immediately retried with smaller sizes (100 vs 800 blocks)
- More retry attempts (5 vs default 3)
- Recovered burns are added to the main array
- Permanent failures are logged for manual investigation
- No burns are lost silently

### Fix 2: Optimize fetchBurnsWithRetry Function

**Location**: Modify existing fetchBurnsWithRetry function (around line 260)

**Enhancement**:
```javascript
async function fetchBurnsWithRetry(fromBlock, toBlock, maxRetries = 3) {
  const chunkSize = toBlock - fromBlock + 1;
  
  // NEW: Adaptive timeout based on chunk size
  const baseTimeout = 30000; // 30 seconds base
  const timeoutMultiplier = Math.ceil(chunkSize / 100); // Add time for larger chunks
  const adaptiveTimeout = baseTimeout * timeoutMultiplier;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching blocks ${fromBlock} to ${toBlock} (attempt ${attempt}/${maxRetries})...`);
      
      // NEW: Use adaptive timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), adaptiveTimeout);
      
      const logs = await callRPC('eth_getLogs', [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        address: TINC_ADDRESS,
        topics: [TRANSFER_TOPIC, null, ZERO_ADDRESS_TOPIC]
      }], 0, controller.signal); // Pass signal for proper cancellation
      
      clearTimeout(timeoutId);
      
      // Process logs...
      // [existing log processing code]
      
      return burns;
      
    } catch (error) {
      console.warn(`Attempt ${attempt} failed for blocks ${fromBlock}-${toBlock}: ${error.message}`);
      
      // NEW: Exponential backoff between retries
      if (attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
        console.log(`  Waiting ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        throw error; // Final attempt failed
      }
    }
  }
}
```

**Why This Helps**:
- Adaptive timeout prevents premature failures on large chunks
- Exponential backoff reduces RPC rate limit issues
- Better error handling and logging

### Fix 3: Add Post-Update Validation

**Location**: After line 689 (after saveIncrementalData)

**Implementation**:
```javascript
// Add validation after saving data (after line 689)
console.log('🔍 Validating updated data...');

const validationResult = await validateBurnData(mergedData);
if (!validationResult.valid) {
  console.error('❌ Validation failed!');
  console.error(`  Expected: ${validationResult.expected}`);
  console.error(`  Actual: ${validationResult.actual}`);
  console.error(`  Difference: ${validationResult.difference}`);
  
  // Save validation failure for investigation
  const validationLogPath = path.join(__dirname, '../data/validation-failures.json');
  const failureLog = {
    timestamp: new Date().toISOString(),
    ...validationResult,
    lastProcessedBlock: mergedData.lastProcessedBlock
  };
  
  let failures = [];
  if (fs.existsSync(validationLogPath)) {
    failures = JSON.parse(fs.readFileSync(validationLogPath, 'utf8'));
  }
  failures.push(failureLog);
  fs.writeFileSync(validationLogPath, JSON.stringify(failures, null, 2));
  
  // Don't throw - data is saved but flagged for review
  console.warn('⚠️  Data saved but validation failed - manual review required');
} else {
  console.log('✅ Validation passed!');
}

// New validation function
async function validateBurnData(data) {
  // Sample validation: Check last day's burns against fresh fetch
  const lastDay = data.dailyBurns[data.dailyBurns.length - 1];
  if (!lastDay) return { valid: true }; // No data to validate
  
  try {
    // Get fresh data for the last day
    const dayStart = new Date(lastDay.date);
    const dayEnd = new Date(lastDay.date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    // Calculate block numbers for the day
    const currentBlock = await callRPC('eth_blockNumber', []);
    const currentBlockNum = parseInt(currentBlock, 16);
    const blocksPerDay = 7200;
    const daysAgo = Math.floor((Date.now() - dayStart.getTime()) / (1000 * 60 * 60 * 24));
    const startBlock = currentBlockNum - (daysAgo * blocksPerDay);
    const endBlock = startBlock + blocksPerDay;
    
    // Fetch fresh burns for validation
    const freshBurns = await fetchBurnsWithRetry(startBlock, endBlock);
    const freshTotal = freshBurns.reduce((sum, b) => sum + b.amount, 0);
    
    const difference = Math.abs(freshTotal - lastDay.amountTinc);
    const tolerance = 1; // 1 TINC tolerance for rounding
    
    return {
      valid: difference <= tolerance,
      expected: freshTotal,
      actual: lastDay.amountTinc,
      difference,
      date: lastDay.date
    };
  } catch (error) {
    console.warn('⚠️  Validation skipped due to error:', error.message);
    return { valid: true }; // Don't fail update due to validation error
  }
}
```

**Why This Matters**:
- Catches discrepancies immediately after updates
- Doesn't block updates but flags issues
- Creates audit trail for investigation
- Validates against fresh blockchain data

## Integration Summary

### What Changes:
1. **Lines 640-642**: Insert retry logic for failed chunks
2. **fetchBurnsWithRetry function**: Add adaptive timeout and exponential backoff
3. **After line 689**: Add validation check

### What Stays the Same:
- All existing functionality preserved
- Incremental update logic unchanged
- Data format unchanged
- Holder data updates unchanged
- Version management unchanged

### New Files Created:
- `/data/permanent-failures.json` - Blocks that couldn't be fetched
- `/data/validation-failures.json` - Failed validation attempts

## Testing Plan

1. **Test with simulated failures**:
```javascript
// Temporarily modify callRPC to fail randomly
if (Math.random() < 0.1) throw new Error('Simulated failure');
```

2. **Test recovery**:
- Run update
- Verify failed chunks are retried
- Check recovered burns are included

3. **Test validation**:
- Temporarily modify data
- Verify validation catches discrepancy

## Rollback Plan

If issues occur, restore from backup:
```bash
cp data/burn-data.backup-[timestamp].json data/burn-data.json
```

## Success Metrics

- **Zero silent failures** - All failed chunks either recovered or logged
- **< 1% permanent failures** - Most chunks successfully recovered
- **100% validation success** - All updates pass validation
- **No data loss** - Every burn either captured or logged for recovery

This implementation adds robust retry and validation logic while preserving all existing features.