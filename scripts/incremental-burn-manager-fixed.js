require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Incremental Burn Manager
 * Handles safe incremental updates of burn data while preserving historical records
 */
class IncrementalBurnManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/burn-data.json');
    this.HISTORICAL_CUTOFF_HOURS = 120; // Don't modify data older than 120 hours (5 days)
  }

  /**
   * Load existing burn data from file
   */
  loadExistingData() {
    if (!fs.existsSync(this.dataPath)) {
      throw new Error('No existing burn data found. Run full refresh first.');
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      console.log(`📁 Loaded existing data: ${data.dailyBurns.length} days, last updated: ${data.fetchedAt}`);
      return data;
    } catch (error) {
      throw new Error(`Failed to load existing data: ${error.message}`);
    }
  }

  /**
   * Determine which dates are immutable (historical) vs updateable (recent)
   */
  categorizeDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00Z');
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.HISTORICAL_CUTOFF_HOURS);
    
    return {
      isHistorical: date < cutoffDate,
      isRecent: date >= cutoffDate
    };
  }

  /**
   * BLOCK-BASED RESUME POINT
   * Gets the last processed block from existing data
   * This is our reliable resume point - no more date guessing!
   * @returns {number} Last processed block number, or 0 if none
   */
  getLastProcessedBlock() {
    try {
      const existingData = this.loadExistingData();
      
      // NEW: Use lastProcessedBlock if available (reliable)
      if (existingData.lastProcessedBlock) {
        console.log(`📦 Last processed block: ${existingData.lastProcessedBlock}`);
        return existingData.lastProcessedBlock;
      }
      
      // FALLBACK: If old data without lastProcessedBlock, estimate from date
      // This is only for migration from old data format
      if (existingData.dailyBurns && existingData.dailyBurns.length > 0) {
        console.log('⚠️ Old data format - will add lastProcessedBlock after update');
        // Return 0 to trigger a careful update
        return 0;
      }
      
      return 0; // No existing data
    } catch (error) {
      console.log('⚠️ Error loading existing data:', error.message);
      return 0;
    }
  }
  
  /**
   * DEPRECATED - Kept for reference only
   * Date-based approach caused data overwrites
   * @deprecated Use getLastProcessedBlock() instead
   */
  getRecentDateRange() {
    console.warn('⚠️ DEPRECATED: getRecentDateRange causes data loss - use block tracking');
    // Old implementation preserved for emergency fallback only
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Merge new recent data with existing historical data
   * FIXED: Now uses block-based logic instead of date ranges
   * Blocks guarantee no duplicate processing, so merge is simple
   */
  mergeData(existingData, recentBurnData) {
    console.log('🔄 Merging new burns with existing data (block-based)...');
    
    // CRITICAL FIX: No more date-based filtering!
    // Since we fetch by blocks, there's no risk of duplicates
    // We can simply merge by date without complex filtering
    
    // Start with existing daily burns
    const combinedDays = [...existingData.dailyBurns];
    
    // Process new burns from recent fetch with transaction-level deduplication
    // CRITICAL: When re-scanning last block, we need to merge by transaction hash
    recentBurnData.dailyBurns.forEach(newDay => {
      const existingIndex = combinedDays.findIndex(d => d.date === newDay.date);

      if (existingIndex >= 0) {
        // Day exists - MERGE transactions (don't replace entire day)
        const existingDay = combinedDays[existingIndex];
        const existingHashes = new Set(existingDay.transactions.map(t => t.hash));

        let addedCount = 0;
        let addedAmount = 0;

        // Add only NEW transactions (skip duplicates from re-scan)
        newDay.transactions.forEach(tx => {
          if (!existingHashes.has(tx.hash)) {
            existingDay.transactions.push(tx);
            existingDay.amountTinc += tx.amount;
            existingDay.transactionCount++;
            addedCount++;
            addedAmount += tx.amount;
          }
        });

        if (addedCount > 0) {
          console.log(`📝 Merged ${newDay.date}: Added ${addedCount} new txs (+${addedAmount.toFixed(3)} TINC)`);
        } else {
          console.log(`✅ ${newDay.date}: No new transactions (re-scan found same data)`);
        }
      } else {
        // New day - add it
        console.log(`➕ Adding new day ${newDay.date}: ${newDay.amountTinc.toFixed(3)} TINC`);
        combinedDays.push(newDay);
      }
    });
    
    // Sort by date
    const sortedDays = combinedDays.sort((a, b) => a.date.localeCompare(b.date));

    // Ensure all 30 days exist (fills zeros for missing dates like Jan 30)
    const { dailyBurns: completeDays, totalBurned, burnPercentage } =
      this.ensureComplete30DayWindow(sortedDays, existingData);

    console.log(`📊 Merge complete:`);
    console.log(`   Days in window: ${completeDays.length}`);
    console.log(`   Total burned: ${totalBurned.toLocaleString()} TINC`);
    console.log(`   Date range: ${completeDays[0]?.date} to ${completeDays[completeDays.length - 1]?.date}`);

    // Return merged data with updated metadata
    return {
      ...existingData, // Preserve original metadata
      dailyBurns: completeDays,
      totalBurned,
      burnPercentage,
      totalSupply: recentBurnData.totalSupply, // FIX: Update totalSupply from fresh RPC call
      startDate: completeDays[0]?.date || existingData.startDate, // FIX: Update to match window
      endDate: completeDays[completeDays.length - 1]?.date || existingData.endDate, // FIX: Update to match window
      fetchedAt: new Date().toISOString(),
      lastIncrementalUpdate: new Date().toISOString(),
      lastProcessedBlock: recentBurnData.lastProcessedBlock, // CRITICAL: Update block marker
      holderStats: recentBurnData.holderStats // Update holder stats
    };
  }

  /**
   * Ensure we have exactly 30 days of data in the correct window
   */
  ensureComplete30DayWindow(dailyBurns, existingData) {
    // Get the existing date range from the data
    if (existingData.dailyBurns && existingData.dailyBurns.length > 0) {
      // Use existing date range to maintain consistency
      const existingStartDate = existingData.dailyBurns[0].date;
      const existingEndDate = existingData.dailyBurns[existingData.dailyBurns.length - 1].date;
      
      // Check if we need to shift the window (new day arrived)
      const today = new Date().toISOString().split('T')[0];
      const lastDate = new Date(existingEndDate);
      const todayDate = new Date(today);
      
      // If today is newer than the last date in our data, shift the window
      if (todayDate > lastDate) {
        const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        // Shift window forward by the difference
        const newStartDate = new Date(existingStartDate);
        newStartDate.setDate(newStartDate.getDate() + daysDiff);
        
        const result = [];
        const existingDayMap = new Map();
        
        // Create map for quick lookup
        dailyBurns.forEach(day => existingDayMap.set(day.date, day));
        
        // Fill 30-day window starting from new start date
        for (let i = 0; i < 30; i++) {
          const currentDate = new Date(newStartDate);
          currentDate.setDate(currentDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          if (existingDayMap.has(dateStr)) {
            result.push(existingDayMap.get(dateStr));
          } else {
            // Fill missing day with zero burns
            result.push({
              date: dateStr,
              amountTinc: 0,
              transactionCount: 0,
              transactions: []
            });
          }
        }
        
        // CRITICAL FIX: Preserve historical total, never let it decrease
        const windowTotal = result.reduce((sum, day) => sum + day.amountTinc, 0);
        const totalBurned = Math.max(existingData.totalBurned || 0, windowTotal);
        const burnPercentage = existingData.totalSupply > 0 ? (totalBurned / existingData.totalSupply) * 100 : 0;
        
        return {
          dailyBurns: result,
          totalBurned,
          burnPercentage
        };
      }
    }
    
    // Fallback to original logic if no shift needed
    const result = [];
    const existingDayMap = new Map();
    
    // Create map for quick lookup
    dailyBurns.forEach(day => existingDayMap.set(day.date, day));
    
    // Use the merged data as-is if no shift needed
    const sortedBurns = dailyBurns.sort((a, b) => a.date.localeCompare(b.date));
    
    // Take the last 30 days
    const last30Days = sortedBurns.slice(-30);
    
    if (last30Days.length === 30) {
      const totalBurned = last30Days.reduce((sum, day) => sum + day.amountTinc, 0);
      const burnPercentage = existingData.totalSupply > 0 ? (totalBurned / existingData.totalSupply) * 100 : 0;
      
      return {
        dailyBurns: last30Days,
        totalBurned,
        burnPercentage
      };
    }
    
    // Fill any gaps
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29); // 30 days total
    
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (existingDayMap.has(dateStr)) {
        result.push(existingDayMap.get(dateStr));
      } else {
        // Fill missing day with zero burns
        result.push({
          date: dateStr,
          amountTinc: 0,
          transactionCount: 0,
          transactions: []
        });
      }
    }
    
    const totalBurned = result.reduce((sum, day) => sum + day.amountTinc, 0);
    const burnPercentage = existingData.totalSupply > 0 ? (totalBurned / existingData.totalSupply) * 100 : 0;
    
    return {
      dailyBurns: result,
      totalBurned,
      burnPercentage
    };
  }

  /**
   * Validate merged data integrity - CRITICAL FIX FOR DATA REGRESSION
   */
  validateMergedData(originalData, mergedData) {
    console.log('🔍 Validating merged data integrity...');
    
    // FIX: totalBurned should equal the 30-day sum (not cumulative all-time)
    // Dashboard only displays 30-day totals, so validate that
    const calculated30DayTotal = mergedData.dailyBurns.reduce((sum, d) => sum + d.amountTinc, 0);
    
    if (Math.abs(mergedData.totalBurned - calculated30DayTotal) > 1) {
      console.warn(`⚠️ Total mismatch with 30-day sum:`);
      console.warn(`  Stored total: ${mergedData.totalBurned.toFixed(2)} TINC`);
      console.warn(`  30-day sum: ${calculated30DayTotal.toFixed(2)} TINC`);
      console.warn(`  Difference: ${Math.abs(mergedData.totalBurned - calculated30DayTotal).toFixed(2)} TINC`);
      
      // Auto-correct to match 30-day window
      mergedData.totalBurned = calculated30DayTotal;
      console.log(`  ✅ Corrected totalBurned to match 30-day sum`);
    }
    
    // Check structure - accept 29-31 days (rolling window edge cases)
    const dayCount = mergedData.dailyBurns?.length || 0;
    if (!mergedData.dailyBurns || dayCount < 29 || dayCount > 31) {
      throw new Error(`Data validation failed: Expected 29-31 days, got ${dayCount}`);
    }
    
    // Check if we have a window shift (start OR end date changed)
    // FIX: Also check start date - slice(-30) can drop oldest days without changing end date
    const originalStartDate = originalData.dailyBurns[0]?.date;
    const mergedStartDate = mergedData.dailyBurns[0]?.date;
    const originalEndDate = originalData.dailyBurns[originalData.dailyBurns.length - 1].date;
    const mergedEndDate = mergedData.dailyBurns[mergedData.dailyBurns.length - 1].date;
    const windowShifted = originalStartDate !== mergedStartDate || originalEndDate !== mergedEndDate;

    if (windowShifted) {
      console.log(`📅 Window shifted: ${originalStartDate}-${originalEndDate} → ${mergedStartDate}-${mergedEndDate}`);
    }
    
    // Check historical data wasn't modified (48+ hours old)
    const historicalChanges = [];
    const recentChanges = [];
    
    originalData.dailyBurns.forEach(originalDay => {
      const category = this.categorizeDate(originalDay.date);
      const mergedDay = mergedData.dailyBurns.find(day => day.date === originalDay.date);
      
      // Handle window shift - oldest days naturally drop off
      if (!mergedDay && windowShifted) {
        const dayDate = new Date(originalDay.date + 'T00:00:00Z');
        const newStartDate = new Date(mergedData.dailyBurns[0].date + 'T00:00:00Z');
        
        if (dayDate < newStartDate) {
          console.log(`📊 Day ${originalDay.date} dropped due to window shift (expected)`);
          return; // This is expected behavior
        }
      }
      
      // For historical data (> 48 hours old), strict validation
      if (category.isHistorical) {
        if (!mergedDay) {
          historicalChanges.push(`Missing historical day: ${originalDay.date}`);
        } else if (Math.abs(mergedDay.amountTinc - originalDay.amountTinc) > 0.001) {
          historicalChanges.push(`Historical data changed for ${originalDay.date}: ${originalDay.amountTinc} → ${mergedDay.amountTinc}`);
        } else if (mergedDay.transactionCount !== originalDay.transactionCount) {
          historicalChanges.push(`Historical transaction count changed for ${originalDay.date}: ${originalDay.transactionCount} → ${mergedDay.transactionCount}`);
        }
      } 
      // For recent data (< 48 hours), allow changes but log them
      else if (category.isRecent && mergedDay) {
        if (Math.abs(mergedDay.amountTinc - originalDay.amountTinc) > 0.001) {
          recentChanges.push(`Recent data updated for ${originalDay.date}: ${originalDay.amountTinc.toFixed(3)} → ${mergedDay.amountTinc.toFixed(3)} TINC (${originalDay.transactionCount} → ${mergedDay.transactionCount} txs)`);
        }
      }
    });
    
    // Log recent data updates (this is normal behavior)
    if (recentChanges.length > 0) {
      console.log('📝 Recent data updates (expected):');
      recentChanges.forEach(change => console.log(`   ${change}`));
    }
    
    // Only fail if historical data (> 72 hours old) was modified
    if (historicalChanges.length > 0) {
      console.error('🚨 CRITICAL: Historical data was modified!');
      historicalChanges.forEach(change => console.error(`   ${change}`));
      throw new Error(`Historical data integrity violation: ${historicalChanges.length} changes detected`);
    }
    
    console.log('✅ Data validation passed - historical data preserved');
    
    // Log summary
    const totalTransactions = mergedData.dailyBurns.reduce((sum, day) => sum + day.transactionCount, 0);
    console.log(`📊 Merged data summary:`);
    console.log(`   Total TINC burned: ${mergedData.totalBurned.toLocaleString()}`);
    console.log(`   Total transactions: ${totalTransactions}`);
    console.log(`   Burn percentage: ${mergedData.burnPercentage.toFixed(4)}%`);
    
    return true;
  }
}

module.exports = IncrementalBurnManager;