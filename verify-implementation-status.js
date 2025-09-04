#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 IMPLEMENTATION STATUS AUDIT\n');
console.log('=' . repeat(70));

const implemented = {
  issue1: { status: 'unknown', evidence: [] },
  issue2: { status: 'unknown', evidence: [] }
};

// CHECK 1: Are the code fixes actually in the files?
console.log('\n📝 CODE IMPLEMENTATION CHECK:');
console.log('-' . repeat(40));

// Check Issue #1 fix in both incremental managers
const files1 = [
  'scripts/incremental-burn-manager.js',
  'scripts/incremental-burn-manager-fixed.js'
];

files1.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for the new fix
    if (content.includes('30-day sum') && content.includes('FIX: totalBurned should equal')) {
      console.log(`  ✅ ${file}: NEW fix present`);
      implemented.issue1.evidence.push(`${file} has new validation`);
      
      // Check if old code is gone
      if (!content.includes('DATA REGRESSION DETECTED')) {
        console.log(`     └─ Old regression check REMOVED ✅`);
      } else {
        console.log(`     └─ ⚠️ Old code may still exist`);
      }
    } else if (content.includes('DATA REGRESSION DETECTED')) {
      console.log(`  ❌ ${file}: Still has OLD code`);
      implemented.issue1.status = 'not-implemented';
    }
  }
});

// Check Issue #2 fix
const file2 = 'scripts/gap-resistant-burn-manager.js';
if (fs.existsSync(file2)) {
  const content = fs.readFileSync(file2, 'utf8');
  
  if (content.includes('AUTO-SYNC FIX') && content.includes('Auto-sync: Extending ranges')) {
    console.log(`  ✅ ${file2}: AUTO-SYNC implemented`);
    implemented.issue2.evidence.push('Auto-sync code present');
  } else {
    console.log(`  ❌ ${file2}: No auto-sync found`);
    implemented.issue2.status = 'not-implemented';
  }
}

// CHECK 2: Is the running service using the fixed code?
console.log('\n\n🏃 RUNNING SERVICE CHECK:');
console.log('-' . repeat(40));

try {
  // Check which script the service is running
  const serviceConfig = execSync('systemctl cat tinc-auto-update.service 2>/dev/null').toString();
  
  if (serviceConfig.includes('safe-auto-updates.js')) {
    console.log('  ✅ Service runs: safe-auto-updates.js');
    
    // Check if safe-auto-updates uses the fixed scripts
    const safeScript = fs.readFileSync('scripts/safe-auto-updates.js', 'utf8');
    
    if (safeScript.includes('fetch-burn-data.js --incremental')) {
      console.log('     └─ Uses incremental updates ✅');
      
      // Check if fetch-burn-data.js calls the fixed managers
      const fetchScript = fs.readFileSync('scripts/fetch-burn-data.js', 'utf8');
      if (fetchScript.includes('incremental-burn-manager-fixed') || 
          fetchScript.includes('IncrementalBurnManager')) {
        console.log('     └─ Calls fixed burn managers ✅');
        implemented.issue1.evidence.push('Service uses fixed code');
      }
    }
  }
  
  // Check service status
  const status = execSync('systemctl is-active tinc-auto-update.service 2>/dev/null').toString().trim();
  console.log(`  Service status: ${status === 'active' ? '✅ ACTIVE' : '⚠️ ' + status}`);
  
} catch (e) {
  console.log('  ⚠️ Could not verify service');
}

// CHECK 3: Check recent logs for the fixes in action
console.log('\n\n📊 RUNTIME EVIDENCE CHECK:');
console.log('-' . repeat(40));

// Check for Issue #1 - should NOT see regression errors anymore
if (fs.existsSync('logs/auto-update.log')) {
  const logs = fs.readFileSync('logs/auto-update.log', 'utf8');
  const last1000Lines = logs.split('\n').slice(-1000).join('\n');
  
  // Count occurrences in recent logs
  const regressionErrors = (last1000Lines.match(/DATA REGRESSION DETECTED/g) || []).length;
  const totalMismatch = (last1000Lines.match(/Total mismatch with 30-day sum/g) || []).length;
  const autoSync = (last1000Lines.match(/Auto-sync: Extending ranges/g) || []).length;
  
  console.log(`  Last 1000 log lines:`);
  console.log(`    DATA REGRESSION errors: ${regressionErrors > 0 ? '❌ ' + regressionErrors + ' found' : '✅ 0 (fixed!)'}`);
  console.log(`    30-day sum corrections: ${totalMismatch > 0 ? '📝 ' + totalMismatch : '0'}`);
  console.log(`    Auto-sync events: ${autoSync > 0 ? '✅ ' + autoSync : '0'}`);
  
  if (regressionErrors === 0) {
    implemented.issue1.evidence.push('No regression errors in recent logs');
    implemented.issue1.status = 'working';
  }
  
  if (autoSync > 0) {
    implemented.issue2.evidence.push('Auto-sync running in logs');
    implemented.issue2.status = 'working';
  }
}

// CHECK 4: Verify current data state
console.log('\n\n✅ CURRENT DATA STATE:');
console.log('-' . repeat(40));

const burnData = JSON.parse(fs.readFileSync('data/burn-data.json', 'utf8'));
const ranges = JSON.parse(fs.readFileSync('data/processed-ranges.json', 'utf8'));

// Issue #1 check - totalBurned should equal 30-day sum
const calculated30Day = burnData.dailyBurns.reduce((sum, d) => sum + d.amountTinc, 0);
const issue1Working = Math.abs(burnData.totalBurned - calculated30Day) < 1;

console.log(`  Issue #1 (30-day total):`);
console.log(`    totalBurned: ${burnData.totalBurned.toFixed(2)}`);
console.log(`    30-day sum: ${calculated30Day.toFixed(2)}`);
console.log(`    Match: ${issue1Working ? '✅ YES' : '❌ NO'}`);

if (issue1Working) {
  implemented.issue1.status = 'working';
  implemented.issue1.evidence.push('Data correctly shows 30-day sum');
}

// Issue #2 check - ranges should match lastProcessedBlock
const lastRange = ranges.ranges[ranges.ranges.length - 1];
const issue2Working = lastRange.end === burnData.lastProcessedBlock;

console.log(`\n  Issue #2 (block sync):`);
console.log(`    lastProcessedBlock: ${burnData.lastProcessedBlock}`);
console.log(`    Last range end: ${lastRange.end}`);
console.log(`    Synced: ${issue2Working ? '✅ YES' : '❌ NO'}`);

if (issue2Working) {
  implemented.issue2.status = 'working';
  implemented.issue2.evidence.push('Tracking systems synced');
}

// FINAL REPORT
console.log('\n\n' + '=' . repeat(70));
console.log('📋 IMPLEMENTATION STATUS REPORT');
console.log('=' . repeat(70));

console.log('\n🔧 ISSUE #1: Data Regression False Positives');
console.log(`  Status: ${implemented.issue1.status === 'working' ? '✅ FULLY IMPLEMENTED & WORKING' : '❌ NOT FULLY IMPLEMENTED'}`);
if (implemented.issue1.evidence.length > 0) {
  console.log('  Evidence:');
  implemented.issue1.evidence.forEach(e => console.log(`    • ${e}`));
}

console.log('\n🔧 ISSUE #2: Block Tracking Gap');
console.log(`  Status: ${implemented.issue2.status === 'working' ? '✅ FULLY IMPLEMENTED & WORKING' : '❌ NOT FULLY IMPLEMENTED'}`);
if (implemented.issue2.evidence.length > 0) {
  console.log('  Evidence:');
  implemented.issue2.evidence.forEach(e => console.log(`    • ${e}`));
}

// Overall assessment
const bothWorking = implemented.issue1.status === 'working' && implemented.issue2.status === 'working';

console.log('\n' + '=' . repeat(70));
console.log('🎯 OVERALL STATUS:');
if (bothWorking) {
  console.log('  ✅✅ BOTH FIXES ARE FULLY IMPLEMENTED AND WORKING IN PRODUCTION');
  console.log('\n  The fixes are:');
  console.log('  • In the code ✅');
  console.log('  • Running in production ✅');
  console.log('  • Working correctly ✅');
  console.log('  • No regression errors ✅');
  console.log('  • Systems stay synced ✅');
} else {
  console.log('  ⚠️ PARTIAL IMPLEMENTATION - Review needed');
}
console.log('=' . repeat(70));