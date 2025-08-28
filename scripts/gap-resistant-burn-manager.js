require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Gap-Resistant Burn Manager
 * Prevents data gaps by tracking processed block ranges and automatically backfilling
 */
class GapResistantBurnManager {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/burn-data.json');
    this.rangesPath = path.join(__dirname, '../data/processed-ranges.json');
    this.CHUNK_SIZE = 800;
  }

  /**
   * Load processed ranges from file or initialize
   */
  loadProcessedRanges() {
    if (fs.existsSync(this.rangesPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.rangesPath, 'utf8'));
        console.log(`📋 Loaded ${data.ranges.length} processed ranges`);
        return data;
      } catch (error) {
        console.warn('⚠️  Could not load ranges, starting fresh');
      }
    }
    
    // Initialize from existing burn data if available
    if (fs.existsSync(this.dataPath)) {
      const burnData = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      const blocks = this.extractBlocksFromBurnData(burnData);
      
      if (blocks.length > 0) {
        // Create initial range from existing data
        const ranges = this.blocksToRanges(blocks);
        return {
          ranges,
          lastContinuousBlock: ranges[0]?.end || 0,
          totalGaps: ranges.length - 1,
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    return {
      ranges: [],
      lastContinuousBlock: 0,
      totalGaps: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Extract all block numbers from burn data
   */
  extractBlocksFromBurnData(burnData) {
    const blocks = new Set();
    
    if (burnData.dailyBurns) {
      burnData.dailyBurns.forEach(day => {
        day.transactions.forEach(tx => {
          if (tx.blockNumber) {
            blocks.add(tx.blockNumber);
          }
        });
      });
    }
    
    return Array.from(blocks).sort((a, b) => a - b);
  }

  /**
   * Convert block numbers to ranges
   */
  blocksToRanges(blocks) {
    if (blocks.length === 0) return [];
    
    const ranges = [];
    let currentRange = { start: blocks[0], end: blocks[0] };
    
    for (let i = 1; i < blocks.length; i++) {
      // If blocks are continuous (allowing small gaps up to 100 blocks)
      if (blocks[i] - currentRange.end <= 100) {
        currentRange.end = blocks[i];
      } else {
        // Start new range
        ranges.push(currentRange);
        currentRange = { start: blocks[i], end: blocks[i] };
      }
    }
    ranges.push(currentRange);
    
    return ranges;
  }

  /**
   * Detect gaps between processed ranges
   */
  detectGaps(ranges) {
    if (ranges.length <= 1) return [];
    
    const gaps = [];
    
    for (let i = 0; i < ranges.length - 1; i++) {
      const gapStart = ranges[i].end + 1;
      const gapEnd = ranges[i + 1].start - 1;
      
      if (gapEnd >= gapStart) {
        gaps.push({
          start: gapStart,
          end: gapEnd,
          size: gapEnd - gapStart + 1,
          hours: ((gapEnd - gapStart + 1) * 12 / 3600).toFixed(1)
        });
      }
    }
    
    return gaps;
  }

  /**
   * Merge overlapping or adjacent ranges
   */
  mergeRanges(ranges) {
    if (ranges.length <= 1) return ranges;
    
    // Sort by start block
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      
      // If ranges overlap or are adjacent (within 1 block)
      if (current.start <= last.end + 1) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Add new processed range and merge
   */
  addProcessedRange(ranges, newStart, newEnd) {
    ranges.push({ start: newStart, end: newEnd });
    return this.mergeRanges(ranges);
  }

  /**
   * Validate data integrity
   */
  validateIntegrity(rangeData, burnData) {
    const issues = [];
    
    // Check for gaps
    const gaps = this.detectGaps(rangeData.ranges);
    if (gaps.length > 0) {
      const totalGapBlocks = gaps.reduce((sum, gap) => sum + gap.size, 0);
      issues.push({
        type: 'gaps',
        severity: 'warning',
        message: `Found ${gaps.length} gaps totaling ${totalGapBlocks} blocks`,
        gaps
      });
    }
    
    // Check if lastProcessedBlock matches ranges
    if (burnData.lastProcessedBlock) {
      const maxRangeEnd = Math.max(...rangeData.ranges.map(r => r.end));
      if (Math.abs(burnData.lastProcessedBlock - maxRangeEnd) > 100) {
        issues.push({
          type: 'mismatch',
          severity: 'error',
          message: `lastProcessedBlock (${burnData.lastProcessedBlock}) doesn't match ranges end (${maxRangeEnd})`
        });
      }
    }
    
    // Check for large time gaps
    const largeGaps = gaps.filter(g => g.size > 5000);
    if (largeGaps.length > 0) {
      issues.push({
        type: 'large_gaps',
        severity: 'critical',
        message: `${largeGaps.length} gaps larger than 5000 blocks detected`,
        largeGaps
      });
    }
    
    return issues;
  }

  /**
   * Save processed ranges
   */
  saveProcessedRanges(rangeData) {
    rangeData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.rangesPath, JSON.stringify(rangeData, null, 2));
    console.log(`💾 Saved ${rangeData.ranges.length} processed ranges`);
  }

  /**
   * Generate integrity report
   */
  generateReport(rangeData, issues) {
    const gaps = this.detectGaps(rangeData.ranges);
    
    console.log('\n════════════════════════════════════════════');
    console.log('         GAP ANALYSIS REPORT                ');
    console.log('════════════════════════════════════════════\n');
    
    console.log('📊 Coverage Statistics:');
    if (rangeData.ranges.length > 0) {
      const totalCovered = rangeData.ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      const firstBlock = rangeData.ranges[0].start;
      const lastBlock = rangeData.ranges[rangeData.ranges.length - 1].end;
      const totalSpan = lastBlock - firstBlock + 1;
      const coverage = ((totalCovered / totalSpan) * 100).toFixed(2);
      
      console.log(`  • Processed ranges: ${rangeData.ranges.length}`);
      console.log(`  • Block range: ${firstBlock} to ${lastBlock}`);
      console.log(`  • Blocks covered: ${totalCovered.toLocaleString()}`);
      console.log(`  • Coverage: ${coverage}%`);
    }
    
    if (gaps.length > 0) {
      console.log(`\n⚠️  Gaps Detected: ${gaps.length}`);
      console.log('  Top 5 largest gaps:');
      gaps.sort((a, b) => b.size - a.size).slice(0, 5).forEach(gap => {
        console.log(`  • Blocks ${gap.start}-${gap.end}: ${gap.size} blocks (~${gap.hours} hours)`);
      });
    } else {
      console.log('\n✅ No gaps detected - continuous coverage!');
    }
    
    if (issues.length > 0) {
      console.log('\n🔍 Integrity Issues:');
      issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${issue.message}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    if (gaps.length > 0) {
      console.log(`  • Run backfill for ${gaps.length} gaps`);
      const estimatedTime = gaps.reduce((sum, g) => sum + g.size, 0) / 1000 * 2;
      console.log(`  • Estimated backfill time: ${estimatedTime.toFixed(0)} seconds`);
    }
    if (issues.some(i => i.severity === 'critical')) {
      console.log('  • Address critical issues immediately');
    }
    
    return { gaps, issues };
  }

  /**
   * Main analysis function
   */
  async analyze() {
    console.log('🔍 Starting Gap-Resistant Analysis...\n');
    
    // Load data
    const rangeData = this.loadProcessedRanges();
    
    let burnData = {};
    if (fs.existsSync(this.dataPath)) {
      burnData = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
    }
    
    // Validate integrity
    const issues = this.validateIntegrity(rangeData, burnData);
    
    // Generate report
    const report = this.generateReport(rangeData, issues);
    
    // Save updated range data
    this.saveProcessedRanges(rangeData);
    
    // Save report
    const reportPath = path.join(__dirname, '../data/gap-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      ranges: rangeData.ranges,
      gaps: report.gaps,
      issues: report.issues,
      stats: {
        totalRanges: rangeData.ranges.length,
        totalGaps: report.gaps.length,
        gapBlocks: report.gaps.reduce((sum, g) => sum + g.size, 0)
      }
    }, null, 2));
    
    console.log(`\n📄 Full report saved to: gap-analysis-report.json`);
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new GapResistantBurnManager();
  manager.analyze().catch(console.error);
}

module.exports = GapResistantBurnManager;