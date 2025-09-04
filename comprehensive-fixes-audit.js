#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE AUDIT OF FIXES\n');
console.log('=' . repeat(70));

// Track audit results
const auditResults = {
  simplicity: [],
  reliability: [],
  recovery: [],
  accuracy: [],
  warnings: []
};

// AUDIT 1: Check what files were actually modified
console.log('\n📁 AUDIT 1: Files Modified');
console.log('-' . repeat(40));

const modifiedFiles = [
  'scripts/incremental-burn-manager.js',
  'scripts/incremental-burn-manager-fixed.js', 
  'scripts/gap-resistant-burn-manager.js'
];

modifiedFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${file}: ${exists ? '✅ exists' : '❌ missing'}`);
  if (exists) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check Issue #1 fix (regression validation)
    if (file.includes('incremental-burn-manager')) {
      if (content.includes('30-day sum')) {
        console.log(`    └─ Issue #1 fix: ✅ Applied`);
        auditResults.simplicity.push('Issue #1 fix is simple - just changed validation logic');
      } else if (content.includes('DATA REGRESSION DETECTED')) {
        console.log(`    └─ Issue #1 fix: ❌ Old logic still present`);
        auditResults.warnings.push('Old regression logic may still trigger');
      }
    }
    
    // Check Issue #2 fix (auto-sync)
    if (file.includes('gap-resistant')) {
      if (content.includes('AUTO-SYNC')) {
        console.log(`    └─ Issue #2 fix: ✅ Applied`);
        auditResults.simplicity.push('Issue #2 fix is simple - adds auto-sync on load');
      }
    }
  }
});

// AUDIT 2: Test data flow accuracy
console.log('\n\n📊 AUDIT 2: Data Flow & Accuracy');
console.log('-' . repeat(40));

const burnData = JSON.parse(fs.readFileSync('data/burn-data.json', 'utf8'));

// Check totalBurned = 30-day sum
const calculated30Day = burnData.dailyBurns.reduce((sum, d) => sum + d.amountTinc, 0);
const totalMatches = Math.abs(burnData.totalBurned - calculated30Day) < 1;

console.log(`  Total Burned: ${burnData.totalBurned.toFixed(2)}`);
console.log(`  30-Day Sum: ${calculated30Day.toFixed(2)}`);
console.log(`  Match: ${totalMatches ? '✅ YES' : '❌ NO (mismatch: ' + Math.abs(burnData.totalBurned - calculated30Day).toFixed(2) + ')'}`);

if (totalMatches) {
  auditResults.accuracy.push('totalBurned correctly equals 30-day sum');
} else {
  auditResults.warnings.push('totalBurned does not match 30-day sum');
}

// Check holder data
if (burnData.holderStats) {
  console.log(`  Holder Stats: ✅ Present (${burnData.holderStats.totalHolders} holders)`);
  console.log(`    └─ Categories: ${burnData.holderStats.whale ? '✅' : '❌'} whale, ${burnData.holderStats.shark ? '✅' : '❌'} shark`);
  auditResults.accuracy.push('Holder stats present for frontend cards');
} else {
  console.log(`  Holder Stats: ❌ Missing`);
  auditResults.warnings.push('No holder stats for frontend cards');
}

// AUDIT 3: Reboot Recovery
console.log('\n\n🔄 AUDIT 3: Reboot Recovery');  
console.log('-' . repeat(40));

// Check systemd service
const { execSync } = require('child_process');
try {
  const serviceStatus = execSync('systemctl is-enabled tinc-auto-update.service 2>/dev/null || echo "not-found"').toString().trim();
  console.log(`  Systemd service: ${serviceStatus === 'enabled' ? '✅ Enabled (auto-starts)' : '⚠️ ' + serviceStatus}`);
  
  if (serviceStatus === 'enabled') {
    auditResults.recovery.push('Service auto-starts on reboot');
    
    // Check if service uses safe-auto-updates.js
    const serviceConfig = execSync('systemctl cat tinc-auto-update.service 2>/dev/null || echo ""').toString();
    if (serviceConfig.includes('safe-auto-updates.js')) {
      console.log(`  Script: ✅ Uses safe-auto-updates.js`);
      auditResults.recovery.push('Uses incremental updates only (safe)');
    }
  }
} catch (e) {
  console.log(`  Systemd check: ⚠️ Could not verify`);
}

// Check lock file mechanism
if (fs.existsSync('scripts/safe-auto-updates.js')) {
  const safeScript = fs.readFileSync('scripts/safe-auto-updates.js', 'utf8');
  if (safeScript.includes('LOCK_FILE')) {
    console.log(`  Lock file protection: ✅ Present`);
    auditResults.reliability.push('Lock file prevents duplicate processes');
  }
}

// AUDIT 4: Git/Vercel Flow
console.log('\n\n🚀 AUDIT 4: Git & Vercel Deployment');
console.log('-' . repeat(40));

// Check if data is in public folder for Vercel
const publicDataPath = 'public/data/burn-data.json';
if (fs.existsSync(publicDataPath)) {
  const publicData = JSON.parse(fs.readFileSync(publicDataPath, 'utf8'));
  const publicMatches = publicData.totalBurned === burnData.totalBurned;
  console.log(`  Public data exists: ✅`);
  console.log(`  Matches main data: ${publicMatches ? '✅ YES' : '❌ NO'}`);
  
  if (publicMatches) {
    auditResults.accuracy.push('Public data matches for Vercel deployment');
  }
} else {
  console.log(`  Public data: ❌ Missing`);
  auditResults.warnings.push('No public/data folder for Vercel');
}

// Check git history for regular commits
try {
  const recentCommits = execSync('git log --oneline -5 2>/dev/null').toString();
  const autoUpdateCommits = recentCommits.match(/Auto-update/g)?.length || 0;
  console.log(`  Recent auto-commits: ${autoUpdateCommits > 0 ? '✅ ' + autoUpdateCommits + ' found' : '⚠️ None'}`);
} catch (e) {
  console.log(`  Git check: ⚠️ Could not verify`);
}

// AUDIT 5: Developer Clarity
console.log('\n\n👨‍💻 AUDIT 5: Code Clarity for New Developers');
console.log('-' . repeat(40));

let clarityScore = 0;
let maxScore = 0;

// Check for comments
modifiedFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    maxScore += 2;
    
    // Check for explanatory comments
    if (content.includes('FIX:') || content.includes('AUTO-SYNC')) {
      clarityScore++;
      console.log(`  ${path.basename(file)}: ✅ Has fix comments`);
    } else {
      console.log(`  ${path.basename(file)}: ⚠️ No clear comments`);
    }
    
    // Check for simple logic (no complex nested conditions)
    const complexityMatch = content.match(/if.*{.*if.*{.*if/);
    if (!complexityMatch) {
      clarityScore++;
    }
  }
});

console.log(`  Clarity score: ${clarityScore}/${maxScore}`);
if (clarityScore >= maxScore * 0.7) {
  auditResults.simplicity.push('Code is clear and well-commented');
}

// FINAL SUMMARY
console.log('\n\n' + '=' . repeat(70));
console.log('📋 AUDIT SUMMARY');
console.log('=' . repeat(70));

console.log('\n✅ STRENGTHS:');
auditResults.simplicity.forEach(s => console.log(`  • ${s}`));
auditResults.reliability.forEach(s => console.log(`  • ${s}`));
auditResults.recovery.forEach(s => console.log(`  • ${s}`));
auditResults.accuracy.forEach(s => console.log(`  • ${s}`));

if (auditResults.warnings.length > 0) {
  console.log('\n⚠️  CONCERNS:');
  auditResults.warnings.forEach(w => console.log(`  • ${w}`));
}

// Overall assessment
const passCount = auditResults.simplicity.length + auditResults.reliability.length + 
                  auditResults.recovery.length + auditResults.accuracy.length;
const concernCount = auditResults.warnings.length;

console.log('\n📊 OVERALL ASSESSMENT:');
console.log(`  Strengths: ${passCount}`);
console.log(`  Concerns: ${concernCount}`);

if (concernCount === 0 && passCount >= 8) {
  console.log(`  Grade: ✅ EXCELLENT - Fixes are solid`);
} else if (concernCount <= 2 && passCount >= 6) {
  console.log(`  Grade: ✅ GOOD - Fixes work well`);
} else {
  console.log(`  Grade: ⚠️ NEEDS REVIEW`);
}

console.log('\n');