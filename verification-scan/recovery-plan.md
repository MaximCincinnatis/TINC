# CRITICAL: TINC Burn Data Recovery Plan
Date: September 2, 2025

## 🚨 EMERGENCY SITUATION
**27,207.45 TINC in burns are missing from production data**

## Missing Transactions to Recover

### High Priority (Large Burns)
1. **0x8da3d496...** - 20,428 TINC - Block 23060356
2. **0x4ecc267f...** - 6,756 TINC - Block 23221725
3. **0x9c5ce9ee...** - 1,280 TINC - Block 23063664

### Medium Priority
4. **0x97f0973c...** - 867 TINC - Block 23221721
5. **0x52c99ffb...** - 256 TINC - Block 23062754
6. Plus 5 more transactions (details in verification)

## Recovery Steps

### Step 1: Stop Auto-Updates Immediately
```bash
# Kill the auto-update process
pkill -f "safe-auto-update"
systemctl stop tinc-burn-tracker || true
```

### Step 2: Backup Current Data
```bash
cp -r data/ data-backup-$(date +%Y%m%d-%H%M%S)/
```

### Step 3: Fetch Full Missing Burns
Use the verification script to get complete transaction details:
```bash
node verification-scan/fetch-missing-details.js
```

### Step 4: Merge Missing Burns
Add the 10 missing transactions (27,207.45 TINC) to production data:
```bash
node verification-scan/merge-verified-burns.js
```

### Step 5: Fix the Update Script
The current script is STILL losing data. We need to:
1. Preserve ALL historical burns beyond 30 days
2. Never allow total to decrease
3. Add validation before saving

### Step 6: Validate Recovery
```bash
node verification-scan/verify-burns-comprehensive.js
```
Expected: 1,057,759.00 TINC total

## Prevention Measures

### Immediate
1. Add validation: `if (newTotal < oldTotal) throw Error("Data regression detected!")`
2. Keep permanent archive of all burns (not just 30-day window)
3. Daily blockchain verification cron job

### Long-term
1. Redesign data structure to separate:
   - Historical burns (permanent)
   - Recent burns (30-day window for display)
   - Total accumulator (never decreases)

2. Implement blockchain-first architecture:
   - Always fetch from blockchain as source of truth
   - Cache for performance only
   - Validate cache against blockchain hourly

## Timeline
- **NOW**: Stop auto-updates
- **Next 15 min**: Backup and recover missing burns
- **Next 30 min**: Fix update script validation
- **Next 1 hour**: Full validation and testing
- **Next 2 hours**: Resume auto-updates with fixes

## Success Criteria
✅ Total burns = 1,057,759.00 TINC (matches blockchain)
✅ All 226 transactions present
✅ No data regression on future updates
✅ Daily validation passes