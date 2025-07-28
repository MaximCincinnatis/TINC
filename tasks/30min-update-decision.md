# 30-Minute Update Analysis & Implementation

## Analysis Results

### **TINC Activity Pattern**:
- 📈 **~3.3 events per hour** (78 events over 24 hours)
- 🎯 **~1.6 events per 30 minutes**
- 👥 **~1 unique address** affected per 30-minute period
- 🔧 **~2 RPC calls** needed per 30-minute update

### **Update Frequency Comparison**:
| Frequency | Efficiency | Daily RPC | Empty Updates | Best For |
|-----------|------------|-----------|---------------|----------|
| 30 min    | 62.5%      | ~82 calls | 37.5%        | Near real-time |
| 1 hour    | 75.0%      | ~46 calls | 25.0%        | Balanced |
| 2 hours   | 83.3%      | ~28 calls | 16.7%        | Efficient |
| 4 hours   | 100%       | ~18 calls | 0%           | Very efficient |

## Decision: **YES, Go with 30-Minute Updates** ✅

### **Why 30-Minutes Makes Sense**:

1. **🚀 Still Very Low RPC Load**:
   - Only ~82 RPC calls per day
   - ~2 calls per update
   - 30x safety margin under rate limits

2. **📊 Better User Experience**:
   - Dashboard updates within 30 minutes of any transfer
   - Users see "fresh" data consistently
   - Good responsiveness during active periods

3. **⚡ Fast Execution**:
   - Each update completes in < 1 second
   - Minimal server resources used
   - Blockchain scanning only covers 150 blocks

4. **🎯 Reasonable Efficiency**:
   - 62.5% of updates find actual changes
   - 37.5% empty updates is acceptable for freshness benefit

### **Trade-offs Accepted**:
- ⚠️ **More empty updates** than longer intervals
- 🔄 **Slightly higher resource usage** 
- 💾 **More frequent cache writes**

But these are minor compared to the user experience benefit.

## Implementation

### **Changed Configuration**:
```javascript
// Before: 4 hours (14,400 seconds)
if (cacheAge < 4) {

// After: 30 minutes (1,800 seconds) 
if (cacheAge < 0.5) {
```

### **Expected Behavior**:
- ✅ **Cache age < 30 minutes**: Use cached data
- 🔄 **Cache age ≥ 30 minutes**: Run incremental update
- 📊 **~2 RPC calls per update**: 1 for events, ~1 for balance checks
- ⏱️ **< 1 second execution time** per update

### **Monitoring Metrics**:
- Track empty update percentage
- Monitor RPC call counts
- Watch for any rate limit warnings
- Measure update execution times

## Alternative Considered: Adaptive Frequency

**Concept**: Start with 30-minute updates, switch to 2-hour updates if no activity detected for multiple cycles.

**Decision**: Not implementing initially due to complexity. Current simple approach is sufficient given low RPC load.

## Conclusion

**30-minute updates provide the best balance for TINC**:
- ✅ Near real-time holder distribution updates
- ✅ Very manageable RPC load (82 calls/day)
- ✅ Simple, consistent implementation
- ✅ Good user experience with fresh data

The slightly higher resource usage is worth it for the improved responsiveness, especially since TINC's low activity means the absolute load remains very light.