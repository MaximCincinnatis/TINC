# Frontend Metrics Fix Proposal
**Date**: September 2, 2025  
**Status**: AWAITING APPROVAL

## Current Issues & Proposed Fixes

### 1. ✅ Circulating Supply - CORRECT LOGIC
**Current Status**: Backend correctly calculates circulating supply  
- `totalSupply` in data = 15,969,783 TINC (already accounts for burns)
- Frontend displays this correctly
- **No fix needed** - working as designed

### 2. ✅ Total Transactions - WORKING
**Current Status**: Correctly shows 218 transactions  
- Will auto-update with new burns
- **No fix needed**

### 3. ❌ 30-Day Burns - NEEDS FIX
**Current Issue**: Shows 1.3M (all-time total including recovered burns)  
**Should Show**: 1.03M (only last 30 days)  

**Root Cause**: 
- Line 76 in `StatsCards.tsx` uses `burnData.totalBurned`
- This includes the 265,599 TINC we recovered from historical data
- Should only show burns from the 30-day window

**Proposed Fix**:
```typescript
// In StatsCards.tsx, replace line 76:

// CURRENT (wrong):
{formatNumber(burnData.totalBurned)}

// PROPOSED (correct):
{formatNumber(burnData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0))}
```

**Alternative cleaner approach**:
```typescript
// Add at top of component (line 11):
const thirtyDayBurns = burnData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);

// Then use on line 76:
{formatNumber(thirtyDayBurns)}
```

### 4. ✅ Emission Rate - CORRECT
**Current Status**: Shows 1.0 TINC/SEC  
- Per your confirmation: TINC has 1 TINC/second inflation rate
- **No fix needed** - working as designed

## Data Flow Verification

### Backend → Frontend Path:
1. **Backend updates**: `data/burn-data.json` (every 30 mins)
2. **Frontend fetches**: `/data/burn-data.json` (from public folder)
3. **Current data status**:
   - Main file has recovered total: 1,296,151 TINC
   - Last update: Aug 29, 2025 (needs refresh)

### ⚠️ Potential Issue Found:
The frontend fetches from `/data/burn-data.json` but this needs to be in the public folder for the React app to access it. Currently it's only in the `data/` folder.

**Proposed Build Process Fix**:
```bash
# In build or deployment script, add:
cp data/burn-data.json public/data/burn-data.json
```

Or update the safe-auto-updates.js to copy to public folder after each update.

## Summary of Required Changes

### Immediate Fix (5 minutes):
1. **Fix 30-day burns display** in `StatsCards.tsx`:
   - Change line 76 to calculate sum of `dailyBurns` array
   - This will show correct 30-day total (1.03M) instead of all-time (1.3M)

### Build Process Fix (10 minutes):
2. **Ensure data file is accessible to frontend**:
   - Add copy step in auto-update script
   - Copy `data/burn-data.json` → `public/data/burn-data.json`
   - This ensures frontend always has latest data

## Implementation Steps

1. **Update StatsCards.tsx**:
   ```typescript
   // Line 11 - Add calculation
   const thirtyDayBurns = burnData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
   
   // Line 76 - Use new variable
   {formatNumber(thirtyDayBurns)}
   ```

2. **Update safe-auto-updates.js** (add after line where data is saved):
   ```javascript
   // Copy to public folder for frontend access
   fs.copyFileSync(
     path.join(__dirname, '../data/burn-data.json'),
     path.join(__dirname, '../public/data/burn-data.json')
   );
   console.log('✅ Data copied to public folder');
   ```

## Expected Results After Fix

| Metric | Current Display | After Fix | Status |
|--------|----------------|-----------|---------|
| Circulating Supply | 16.0M | 16.0M | ✅ Already correct |
| Total Transactions | 218 | 218+ | ✅ Will update |
| 30-Day Burns | 1.3M | 1.03M | ✅ Fixed |
| Emission Rate | 1.0/sec | 1.0/sec | ✅ Already correct |

## Testing Plan

1. Apply StatsCards.tsx fix
2. Run `npm run build` 
3. Verify 30-day burns shows ~1.03M
4. Trigger auto-update
5. Confirm new data appears on frontend

**Please approve to proceed with implementation.**