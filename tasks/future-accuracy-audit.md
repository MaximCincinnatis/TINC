# Future Accuracy Audit: TINC Holder Distribution Updates

## Current Status
- **Fixed Issue**: Previously showing only 20 holders instead of 986
- **Current Data**: Accurate with 986 holders from Moralis API
- **Data Source**: Currently using Moralis API fallback (reliable)

## Future Update Mechanism Analysis

### 1. Primary Update Flow (`fetch-burn-data.js`)
```
Cache Age < 12 hours → Use cached data ✅
Cache Age ≥ 12 hours → Incremental update via blockchain events ⚠️
No cache/failure → Full blockchain scan OR Moralis fallback ✅
```

### 2. Identified Risk: Incremental Update System

**Problem**: The incremental update system (`transfer-event-monitor.js`) has a critical flaw:

- **Only tracks recent transfer events** - misses holders who haven't transacted recently
- **Limited scope** - only updates addresses that appear in recent transfer logs
- **Gradual data degradation** - over time, inactive holders may be lost from cache

**Example Scenario**:
- Day 1: Full scan finds 986 holders
- Day 2: Incremental update only checks 50 addresses with recent activity
- Day 30: Cache may be missing hundreds of inactive holders

### 3. Fallback Mechanisms

**Good**: Multiple fallback layers exist:
1. Incremental update (problematic)
2. Full blockchain scan (slow but accurate)  
3. Moralis API (fast and accurate)

**Current Reliability**:
- ✅ Moralis API works and provides accurate data
- ✅ Full blockchain scan works but takes 8-10 minutes
- ⚠️ Incremental updates are unreliable for complete holder counts

### 4. Cache Expiration Behavior

**Current Logic**:
- Cache valid < 12 hours: Use cached data
- Cache 12+ hours old: Attempt incremental update
- Update fails: Fall back to full scan or Moralis

**Risk**: The incremental update step often fails to maintain accuracy.

## Recommendations for Maintaining Accuracy

### 1. **Immediate Fix**: Modify Update Priority
Change the update logic to prefer Moralis API over incremental updates:

```javascript
// Current problematic flow:
if (cacheAge >= 12) {
  // Try incremental update first (unreliable)
  // Fall back to Moralis only on failure
}

// Recommended flow:
if (cacheAge >= 12) {
  // Try Moralis API first (fast and accurate)
  // Fall back to incremental/full scan only if Moralis fails
}
```

### 2. **Long-term Solution**: Periodic Full Refresh
- Run full Moralis API refresh every 24-48 hours
- Use incremental updates only for very recent data (< 2 hours)
- Set up monitoring to alert if holder count drops unexpectedly

### 3. **Monitoring**: Add Data Quality Checks
```javascript
// Add validation logic
if (newHolderCount < (previousHolderCount * 0.95)) {
  console.warn('⚠️ Holder count dropped >5% - using fallback data source');
  // Force Moralis API refresh
}
```

### 4. **Configuration**: Environment-based Fallback
```javascript
// Prefer Moralis when available
if (MORALIS_API_KEY && cacheAge >= 6) {  // Reduced threshold
  return await fetchRealHolderData(); // Moralis first
}
```

## Accuracy Forecast

### **Current Setup (Post-Fix)**
- ✅ **Next 24 hours**: Accurate (using current Moralis data)
- ⚠️ **Next week**: Risk of degradation if incremental updates are used
- ❌ **Next month**: High risk of significant under-counting

### **With Recommended Changes**
- ✅ **Next 24 hours**: Accurate
- ✅ **Next week**: Accurate (Moralis API preferred)
- ✅ **Next month**: Accurate (with proper fallback priority)

## Critical Action Items

1. **Modify `scripts/fetch-burn-data.js`** to prefer Moralis API over incremental updates
2. **Reduce cache age threshold** from 12 hours to 6 hours for more frequent refreshes  
3. **Add holder count validation** to detect and prevent data degradation
4. **Set up periodic full refresh** independent of the incremental system

## Conclusion

**Current state**: Fixed but fragile. The holder distribution is accurate now but will likely degrade over time due to the flawed incremental update system prioritizing blockchain event monitoring over API-based full refreshes.

**Recommendation**: Implement the suggested changes to maintain long-term accuracy.