# Failed Chunks Recovery Proposal

## You're Right - Current Solution Has a Problem!

If chunks fail, they're skipped forever. That means **permanent data loss**.

## The Issue:
```javascript
// Current: Chunk 100-200 fails
catch (error) {
  console.warn("Chunk failed, continuing...");
  // NEVER RETRIES THIS CHUNK!
}
// Next run: Starts from block 201+
// Blocks 100-200 are LOST FOREVER
```

## Simple Solution: Track Failed Chunks

### Option 1: Save Failed Chunks to File (Simplest)
```javascript
// In fetch-burn-data.js
const failedChunksFile = './data/failed-chunks.json';

// After processing, save failed chunks
if (failedChunks.length > 0) {
  fs.writeFileSync(failedChunksFile, JSON.stringify(failedChunks));
  console.warn(`⚠️ Saved ${failedChunks.length} failed chunks for retry`);
}

// On next run, check for failed chunks FIRST
if (fs.existsSync(failedChunksFile)) {
  const previousFailed = JSON.parse(fs.readFileSync(failedChunksFile));
  console.log(`🔄 Retrying ${previousFailed.length} previously failed chunks...`);
  
  for (const chunk of previousFailed) {
    try {
      const burns = await fetchBurnsWithRetry(chunk.fromBlock, chunk.toBlock);
      allBurns.push(...burns);
      // Success! Remove from failed list
    } catch (error) {
      // Still failing - keep in list
      stillFailedChunks.push(chunk);
    }
  }
  
  // Update or delete failed chunks file
  if (stillFailedChunks.length === 0) {
    fs.unlinkSync(failedChunksFile);
  } else {
    fs.writeFileSync(failedChunksFile, JSON.stringify(stillFailedChunks));
  }
}
```

### Option 2: Don't Update lastProcessedBlock If Chunks Failed
```javascript
// Only update lastProcessedBlock if ALL chunks succeeded
if (failedChunks.length === 0) {
  data.lastProcessedBlock = currentBlock;
  console.log('✅ All chunks successful - updating to block', currentBlock);
} else {
  // Keep old lastProcessedBlock
  console.warn(`⚠️ Keeping lastProcessedBlock at ${data.lastProcessedBlock} due to failures`);
  console.warn(`   Will retry blocks ${failedChunks[0].fromBlock}-${currentBlock} next run`);
}
```

### Option 3: Hybrid - Move Forward But Track Gaps
```javascript
// Always update lastProcessedBlock but track gaps
data.lastProcessedBlock = currentBlock;
data.knownGaps = data.knownGaps || [];

if (failedChunks.length > 0) {
  // Add to known gaps
  failedChunks.forEach(chunk => {
    data.knownGaps.push({
      fromBlock: chunk.fromBlock,
      toBlock: chunk.toBlock,
      failedAt: new Date().toISOString(),
      attempts: 1
    });
  });
}

// On each run, try to fill gaps first
if (data.knownGaps && data.knownGaps.length > 0) {
  console.log(`🔄 Attempting to fill ${data.knownGaps.length} known gaps...`);
  // Try each gap, remove if successful
}
```

## Recommendation: Option 2 (Simplest & Safest)

**Don't advance lastProcessedBlock if chunks failed:**

```javascript
// In fetch-burn-data.js incremental mode
const failedChunks = [];
// ... process chunks ...

if (failedChunks.length > 0) {
  console.warn(`⚠️ ${failedChunks.length} chunks failed - will retry next run`);
  // DON'T update lastProcessedBlock
  mergedData.lastProcessedBlock = existingData.lastProcessedBlock;
} else {
  // All successful - safe to advance
  mergedData.lastProcessedBlock = currentBlock;
}
```

### Why This Works:
- **Next run**: Starts from same position, retries failed blocks
- **No data loss**: Eventually gets the data when RPC works
- **Simple**: No extra files or complex tracking
- **Safe**: Never claims to be at block X when missing data before X

### What Happens:
1. Blocks 100-200 fail → Stay at lastProcessedBlock 99
2. Next run: Try 100-200 again
3. If succeeds → Move to block 200
4. If fails again → Stay at 99, try again later

## Your Approval?

This ensures **no data is ever permanently skipped**. Failed chunks get retried automatically on every run until they succeed.