# Minimal Fix Proposal: Don't Advance on Failure

## The ONE Line We Need to Change

Currently on **line 683** of fetch-burn-data.js:
```javascript
mergedData.lastProcessedBlock = currentBlock;
```

## Simple Fix: Make It Conditional

### Change line 683 from:
```javascript
mergedData.lastProcessedBlock = currentBlock;
```

### To:
```javascript
// Only advance if no chunks failed
mergedData.lastProcessedBlock = failedChunks.length === 0 
  ? currentBlock 
  : existingData.lastProcessedBlock;
```

## That's It!

### What This Does:
- **No failures**: Updates to currentBlock (normal behavior)
- **Any failures**: Keeps old position (will retry next run)

### Everything Else Stays The Same:
- ✅ Still processes all chunks it can
- ✅ Still saves partial data 
- ✅ Still logs warnings about failures
- ✅ Still runs every 30 minutes
- ✅ Still tracks holder data
- ✅ Still validates data
- ✅ Still creates backups

### The Only Change:
**One conditional** on line 683 that says "only advance position if everything succeeded"

## Why This Is Perfect:

1. **Minimal change** - Literally one line
2. **No new features** - Just changes when we update position
3. **No side effects** - Everything else works exactly the same
4. **Self-healing** - Automatically retries on next run

## Implementation:

Since `failedChunks` is already tracked (we added it earlier), we just need to check it before updating position.

### Full context (lines 680-685):
```javascript
const mergedData = manager.mergeData(existingData, recentBurnData);

// Ensure lastProcessedBlock is preserved in merged data
mergedData.lastProcessedBlock = failedChunks.length === 0 
  ? currentBlock 
  : existingData.lastProcessedBlock;
  
if (failedChunks.length > 0) {
  console.warn(`⚠️ Not advancing position due to ${failedChunks.length} failed chunks`);
}
```

## Ready to Implement?

This is the absolute minimal change that:
- Prevents data loss
- Maintains all features
- Adds no complexity
- Uses existing variables

Just making the position update conditional based on success.