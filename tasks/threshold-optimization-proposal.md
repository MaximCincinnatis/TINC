# Threshold Optimization Proposal

## Current Arbitrary Values
You're absolutely right - the thresholds are arbitrary:
- **1.5 hours** for gap detection
- **2 hours** for catch-up mode

## The Problem
Updates run every **30 minutes**, so these thresholds don't align with the update cycle.

## Better Approach: Update-Cycle-Based Thresholds

### Proposed Values:
```javascript
const UPDATE_INTERVAL_MINUTES = 30;

// Detect gap after missing ONE update cycle (plus buffer)
const GAP_THRESHOLD = UPDATE_INTERVAL_MINUTES * 1.2; // 36 minutes

// Enter catch-up after missing TWO cycles
const CATCHUP_THRESHOLD = UPDATE_INTERVAL_MINUTES * 2.5; // 75 minutes (2.5 cycles)
```

### Why This Is Better:

1. **Gap Detection (36 minutes)**
   - Normal update: Every 30 minutes
   - With 20% buffer: 36 minutes
   - **Logic**: If >36 minutes since last update, we missed a cycle
   - **Action**: Log warning but continue normal update

2. **Catch-Up Mode (75 minutes)**
   - Missed 2+ cycles = 60+ minutes behind
   - With buffer: 75 minutes
   - **Logic**: Missing 2+ cycles indicates system issue
   - **Action**: Run continuous updates to catch up

### Even Simpler: Just Track Missed Cycles

```javascript
function detectMissedCycles() {
  const data = JSON.parse(fs.readFileSync('./data/burn-data.json'));
  const minutesSinceUpdate = (Date.now() - new Date(data.fetchedAt)) / 60000;
  const missedCycles = Math.floor(minutesSinceUpdate / UPDATE_INTERVAL_MINUTES);
  
  if (missedCycles === 0) {
    // On schedule
    return { action: 'normal' };
  } else if (missedCycles === 1) {
    // Slightly behind
    log(`⚠️ Missed 1 update cycle`);
    return { action: 'normal' };
  } else {
    // Significantly behind
    log(`🚨 Missed ${missedCycles} update cycles!`);
    return { 
      action: 'catchup',
      cyclesToRun: Math.min(missedCycles, 10) // Cap at 10 for safety
    };
  }
}
```

## Recommended Implementation

### Option 1: Dynamic Thresholds (Best)
```javascript
// In safe-auto-updates.js
const GAP_DETECTION_MINUTES = UPDATE_INTERVAL_MINUTES * 1.2;      // 36 min
const CATCHUP_TRIGGER_MINUTES = UPDATE_INTERVAL_MINUTES * 2;      // 60 min
const MAX_CATCHUP_CYCLES = UPDATE_INTERVAL_MINUTES > 30 ? 5 : 10; // Adaptive

async function detectDataGap() {
  // ... existing code ...
  const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
  
  if (minutesSinceUpdate > GAP_DETECTION_MINUTES) {
    log(`⚠️ Data gap: ${minutesSinceUpdate.toFixed(0)} minutes since last update`);
    
    if (minutesSinceUpdate > CATCHUP_TRIGGER_MINUTES) {
      const missedCycles = Math.floor(minutesSinceUpdate / UPDATE_INTERVAL_MINUTES);
      return { 
        hasGap: true, 
        needsCatchup: true,
        missedCycles,
        minutesBehind: minutesSinceUpdate
      };
    }
    
    return { hasGap: true, needsCatchup: false };
  }
  
  return { hasGap: false };
}
```

### Option 2: Simple Fixed Values (Quick Fix)
```javascript
// More sensible fixed values
const GAP_THRESHOLD = 45;    // 1.5x update interval
const CATCHUP_THRESHOLD = 60; // 2x update interval
```

## Why This Matters

**Current Problem**: 
- 1.5 hours = 3 missed cycles (too lenient)
- System could be 90 minutes behind before noticing

**With New Thresholds**:
- 36 minutes = Immediate detection after 1 missed cycle
- 60 minutes = Catch-up after 2 missed cycles
- Faster recovery, less data lag

## Recommendation

Change to **dynamic thresholds** based on `UPDATE_INTERVAL_MINUTES`:
1. Detect gaps at 1.2x interval (36 min for 30-min updates)
2. Catch up at 2x interval (60 min for 30-min updates)
3. Run catch-up cycles = number of missed updates (capped at 10)

This makes the system adaptive - if you change update frequency to 15 minutes, thresholds automatically adjust.

## Do You Approve?
- [ ] Yes - implement dynamic thresholds
- [ ] Yes - but use simple fixed values (45/60 min)
- [ ] No - keep current values
- [ ] Other suggestion: ___________