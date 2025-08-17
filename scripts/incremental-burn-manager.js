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
    this.HISTORICAL_CUTOFF_HOURS = 48; // Don't modify data older than 48 hours
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
   * Get date range for recent data that needs updating
   */
  getRecentDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3); // Fetch last 3 days for safety
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Merge new recent data with existing historical data
   */
  mergeData(existingData, recentBurnData) {
    console.log('🔄 Merging recent data with historical records...');
    
    // Get recent date range
    const { startDate, endDate } = this.getRecentDateRange();
    const recentDates = new Set();
    
    // Build set of recent dates
    const current = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    
    while (current <= end) {
      recentDates.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    // Separate historical from recent data
    const historicalDays = existingData.dailyBurns.filter(day => {
      const category = this.categorizeDate(day.date);
      if (category.isHistorical) {
        console.log(`📚 Preserving historical data for ${day.date}: ${day.amountTinc.toLocaleString()} TINC (${day.transactionCount} txs)`);
        return true;
      }
      return false;
    });
    
    // Get recent data from new fetch
    const recentDays = recentBurnData.dailyBurns.filter(day => recentDates.has(day.date));
    
    console.log(`📊 Data merge summary:`);
    console.log(`   Historical days preserved: ${historicalDays.length}`);
    console.log(`   Recent days updated: ${recentDays.length}`);
    
    // Combine and sort by date
    const allDays = [...historicalDays, ...recentDays]
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Ensure we still have exactly 30 days by filling gaps if needed
    const mergedData = this.ensureComplete30DayWindow(allDays, existingData);
    
    // Update metadata but preserve historical totals
    return {
      ...existingData, // Preserve original metadata
      dailyBurns: mergedData.dailyBurns,
      totalBurned: mergedData.totalBurned,
      burnPercentage: mergedData.burnPercentage,
      fetchedAt: new Date().toISOString(),
      lastIncrementalUpdate: new Date().toISOString(),
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
        
        const totalBurned = result.reduce((sum, day) => sum + day.amountTinc, 0);
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
   * Validate merged data integrity
   */
  validateMergedData(originalData, mergedData) {
    console.log('🔍 Validating merged data integrity...');
    
    // Check structure
    if (!mergedData.dailyBurns || mergedData.dailyBurns.length !== 30) {
      throw new Error(`Data validation failed: Expected 30 days, got ${mergedData.dailyBurns?.length || 0}`);
    }
    
    // Check if we have a new day that would cause window shift
    const originalEndDate = originalData.dailyBurns[originalData.dailyBurns.length - 1].date;
    const mergedEndDate = mergedData.dailyBurns[mergedData.dailyBurns.length - 1].date;
    const windowShifted = originalEndDate !== mergedEndDate;
    
    if (windowShifted) {
      console.log(`📅 Window shifted: ${originalEndDate} → ${mergedEndDate}`);
    }
    
    // Check historical data wasn't modified (48+ hours old)
    const historicalChanges = [];
    
    originalData.dailyBurns.forEach(originalDay => {
      const category = this.categorizeDate(originalDay.date);
      if (category.isHistorical) {
        const mergedDay = mergedData.dailyBurns.find(day => day.date === originalDay.date);
        
        // If window shifted, oldest historical days will naturally drop off
        if (!mergedDay && windowShifted) {
          // Check if this day was dropped due to window shift (oldest day)
          const originalStartDate = originalData.dailyBurns[0].date;
          if (originalDay.date === originalStartDate) {
            console.log(`📊 Oldest day ${originalDay.date} dropped due to window shift (expected)`);
            return; // This is expected behavior
          }
        }
        
        if (!mergedDay) {
          historicalChanges.push(`Missing historical day: ${originalDay.date}`);
        } else if (Math.abs(mergedDay.amountTinc - originalDay.amountTinc) > 0.001) {
          historicalChanges.push(`Historical data changed for ${originalDay.date}: ${originalDay.amountTinc} → ${mergedDay.amountTinc}`);
        } else if (mergedDay.transactionCount !== originalDay.transactionCount) {
          historicalChanges.push(`Historical transaction count changed for ${originalDay.date}: ${originalDay.transactionCount} → ${mergedDay.transactionCount}`);
        }
      }
    });
    
    if (historicalChanges.length > 0) {
      console.error('🚨 CRITICAL: Historical data was modified!');
      historicalChanges.forEach(change => console.error(`   ${change}`));
      throw new Error(`Historical data integrity violation: ${historicalChanges.length} changes detected`);
    }
    
    console.log('✅ Data validation passed - no historical data modified');
    
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