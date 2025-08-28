# Catch-Up Mechanism Proposal

## Current Problem
You're right! The auto-update has a critical flaw:
- **Fixed 30-minute intervals** regardless of how behind we are
- **No catch-up logic** - if behind by hours/days, takes forever to catch up
- **May miss transactions** during the gap periods

## Current Behavior Analysis

### What Happens Now:
```javascript
// Runs every 30 minutes, period.
setInterval(runSafeIncrementalUpdate, UPDATE_INTERVAL_MS);
```

**Problem Scenario:**
1. System goes down for 6 hours
2. Misses 12 update cycles (6 hours / 30 min)
3. On restart, only fetches latest 30 minutes of data
4. **Result:** 5.5 hours of burns permanently missing!

## Proposed Solution: Smart Catch-Up Mode

### Simple Implementation:

```javascript
// Add to safe-auto-updates.js

let catchingUp = false;
let lastSuccessfulBlock = null; // Track where we left off

async function runSmartUpdate() {
    // 1. Check how far behind we are
    const currentBlock = await getBlockNumber();
    const lastProcessed = getLastProcessedBlock(); // from file
    const blocksBehind = currentBlock - lastProcessed;
    const hoursBehind = (blocksBehind * 12) / 3600; // 12 sec per block
    
    if (hoursBehind > 1) {
        log(`⚠️ We're ${hoursBehind.toFixed(1)} hours behind! Entering catch-up mode...`);
        catchingUp = true;
    }
    
    // 2. If catching up, run continuously with small batches
    if (catchingUp) {
        while (blocksBehind > 100) { // More than ~20 minutes behind
            // Process in 1-hour chunks to avoid timeouts
            const chunkSize = 300; // ~1 hour of blocks
            await processBlocks(lastProcessed, lastProcessed + chunkSize);
            
            lastProcessed += chunkSize;
            blocksBehind = currentBlock - lastProcessed;
            
            // Brief pause to avoid overwhelming RPC
            await sleep(2000);
            
            log(`📈 Catch-up progress: ${blocksBehind} blocks remaining`);
        }
        
        catchingUp = false;
        log('✅ Caught up! Resuming normal schedule.');
    }
    
    // 3. Normal update
    await runSafeIncrementalUpdate();
}
```

### Even Simpler: Check Gap on Every Run

```javascript
async function detectAndFillGaps() {
    const data = JSON.parse(fs.readFileSync('./data/burn-data.json'));
    const lastUpdate = new Date(data.fetchedAt);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 1) {
        log(`🚨 Gap detected: ${hoursSinceUpdate.toFixed(1)} hours since last update`);
        
        // Instead of normal 30-min update, fetch ALL missing data
        const startBlock = data.lastProcessedBlock || estimateBlockFromTime(lastUpdate);
        const endBlock = await getCurrentBlock();
        
        log(`📊 Fetching missing data: blocks ${startBlock} to ${endBlock}`);
        await fetchBurnData(startBlock, endBlock);
    }
}

// Run this check before every scheduled update
async function runSafeIncrementalUpdate() {
    await detectAndFillGaps(); // Fill any gaps first
    // Then normal incremental update...
}
```

### Simplest Fix: Add Recovery Check

```javascript
// At startup, check if we missed updates
async function checkForMissedUpdates() {
    const lastRunFile = './data/.last-update-time';
    
    if (fs.existsSync(lastRunFile)) {
        const lastRun = new Date(fs.readFileSync(lastRunFile, 'utf8'));
        const missedMinutes = (Date.now() - lastRun) / (1000 * 60);
        
        if (missedMinutes > UPDATE_INTERVAL_MINUTES * 2) {
            log(`⚠️ Missed ${Math.floor(missedMinutes / 30)} update cycles!`);
            
            // Run multiple updates to catch up
            const cyclesToRun = Math.ceil(missedMinutes / UPDATE_INTERVAL_MINUTES);
            
            for (let i = 0; i < cyclesToRun; i++) {
                log(`Running catch-up update ${i + 1}/${cyclesToRun}...`);
                await runSafeIncrementalUpdate();
                await sleep(5000); // Small delay between updates
            }
        }
    }
    
    // Save current time
    fs.writeFileSync(lastRunFile, new Date().toISOString());
}

// Run on startup
checkForMissedUpdates();
```

## Best Solution: Track Block Numbers

```javascript
// Instead of time-based, track exact block numbers
const stateFile = './data/update-state.json';

function getUpdateState() {
    if (fs.existsSync(stateFile)) {
        return JSON.parse(fs.readFileSync(stateFile));
    }
    return { lastProcessedBlock: null };
}

function saveUpdateState(block) {
    fs.writeFileSync(stateFile, JSON.stringify({
        lastProcessedBlock: block,
        lastUpdateTime: new Date().toISOString()
    }, null, 2));
}

async function runIncrementalUpdate() {
    const state = getUpdateState();
    const currentBlock = await getBlockNumber();
    
    // Start from last processed block or estimate from 30 days ago
    const fromBlock = state.lastProcessedBlock || 
                     await estimateBlockByDaysAgo(30);
    
    log(`📊 Fetching blocks ${fromBlock} to ${currentBlock}`);
    log(`📈 That's ${currentBlock - fromBlock} blocks to process`);
    
    // Process ALL blocks since last update
    // This ensures we never miss anything!
    await fetchBurns(fromBlock, currentBlock);
    
    // Save where we stopped
    saveUpdateState(currentBlock);
}
```

## Implementation Priority

### 1. Quick Fix (Do NOW):
Add gap detection - check `fetchedAt` timestamp and fetch missing hours

### 2. Better Fix (Next Update): 
Track `lastProcessedBlock` in burn-data.json

### 3. Best Fix (Future):
Separate state tracking file with automatic catch-up logic

## Benefits:
✅ **Never miss burns** - Always fetches from last known point
✅ **Automatic recovery** - Catches up after downtime
✅ **No manual intervention** - Self-healing system
✅ **Prevents the Aug 8 issue** - Complete data coverage

The key insight: **Stop using time-based updates, use block-based tracking instead!**