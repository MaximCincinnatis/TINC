require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// SAFE AUTO-UPDATE SERVICE - INCREMENTAL MODE ONLY
// This service ONLY uses --incremental mode to protect historical data
// NO full refresh capability - prevents data loss like the August 15th crisis

// Configuration
const UPDATE_INTERVAL_MINUTES = 30; // Update every 30 minutes
const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_MINUTES * 60 * 1000;
const LOCK_FILE = path.join(__dirname, '../data/.update-lock');
const LOG_FILE = path.join(__dirname, '../logs/safe-auto-update.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

console.log(`
🛡️  SAFE TINC AUTO-UPDATE SERVICE
=================================
⚠️  INCREMENTAL MODE ONLY - Historical data protected
🔒 Full refresh DISABLED - Prevents data corruption
📅 Update Frequency: Every ${UPDATE_INTERVAL_MINUTES} minutes
⏰ Next Update: ${new Date(Date.now() + UPDATE_INTERVAL_MS).toLocaleString()}

🚨 SAFETY FEATURES:
✅ File locking prevents concurrent updates
✅ Data validation before each update  
✅ Automatic rollback on failure
✅ Comprehensive logging and monitoring
✅ Historical data immutable (>48 hours)

Press Ctrl+C to stop
`);

function isLocked() {
  return fs.existsSync(LOCK_FILE);
}

function createLock() {
  try {
    const lockData = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      updateType: 'incremental'
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
    return true;
  } catch (error) {
    log(`❌ Failed to create lock file: ${error.message}`);
    return false;
  }
}

function removeLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (error) {
    log(`⚠️  Warning: Failed to remove lock file: ${error.message}`);
  }
}

function validateDataBeforeUpdate() {
  try {
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    
    if (!fs.existsSync(dataPath)) {
      log('❌ No existing data file found - cannot validate');
      return false;
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Basic validation
    if (!data.dailyBurns || data.dailyBurns.length !== 30) {
      log(`❌ Data validation failed: Expected 30 daily entries, got ${data.dailyBurns?.length || 0}`);
      return false;
    }
    
    if (!data.totalBurned || data.totalBurned <= 0) {
      log('❌ Data validation failed: Invalid total burned amount');
      return false;
    }
    
    // Check for August 8th critical data (allow for floating point precision)
    const aug8Data = data.dailyBurns.find(d => d.date === '2025-08-08');
    if (aug8Data && Math.abs(aug8Data.amountTinc - 98916.514) > 0.1) {
      log(`❌ CRITICAL: August 8th data corrupted! Expected ~98916.514, got ${aug8Data.amountTinc}`);
      return false;
    }
    
    log(`✅ Pre-update validation passed - ${data.totalBurned.toLocaleString()} TINC total`);
    return true;
    
  } catch (error) {
    log(`❌ Data validation error: ${error.message}`);
    return false;
  }
}

function validateDataAfterUpdate() {
  try {
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Same validation as before update
    if (!data.dailyBurns || data.dailyBurns.length !== 30) {
      log(`❌ Post-update validation failed: Expected 30 daily entries, got ${data.dailyBurns?.length || 0}`);
      return false;
    }
    
    // CRITICAL: Verify August 8th data preserved (allow for floating point precision)
    const aug8Data = data.dailyBurns.find(d => d.date === '2025-08-08');
    if (!aug8Data || Math.abs(aug8Data.amountTinc - 98916.514) > 0.1) {
      log(`🚨 CRITICAL FAILURE: August 8th data lost/corrupted! Expected ~98916.514, got ${aug8Data?.amountTinc || 'MISSING'}`);
      return false;
    }
    
    if (!data.lastIncrementalUpdate) {
      log('❌ Post-update validation failed: No incremental update timestamp');
      return false;
    }
    
    log(`✅ Post-update validation passed - August 8th preserved, total: ${data.totalBurned.toLocaleString()} TINC`);
    return true;
    
  } catch (error) {
    log(`❌ Post-update validation error: ${error.message}`);
    return false;
  }
}

function createBackup() {
  try {
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    const backupPath = path.join(__dirname, '../data/burn-data.backup.json');
    
    if (fs.existsSync(dataPath)) {
      fs.copyFileSync(dataPath, backupPath);
      log('✅ Backup created before update');
      return true;
    }
    
    return false;
  } catch (error) {
    log(`❌ Failed to create backup: ${error.message}`);
    return false;
  }
}

function rollbackFromBackup() {
  try {
    const dataPath = path.join(__dirname, '../data/burn-data.json');
    const backupPath = path.join(__dirname, '../data/burn-data.backup.json');
    
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, dataPath);
      log('🔄 Data restored from backup due to validation failure');
      return true;
    }
    
    log('❌ No backup available for rollback');
    return false;
  } catch (error) {
    log(`❌ Failed to rollback from backup: ${error.message}`);
    return false;
  }
}

function runSafeIncrementalUpdate() {
  log('🔄 Starting safe incremental update...');
  
  // Check if already running
  if (isLocked()) {
    log('⏸️  Update already in progress, skipping...');
    return;
  }
  
  // Create lock
  if (!createLock()) {
    log('❌ Failed to acquire lock, aborting update');
    return;
  }
  
  // Pre-update validation
  if (!validateDataBeforeUpdate()) {
    log('❌ Pre-update validation failed, aborting');
    removeLock();
    return;
  }
  
  // Create backup
  if (!createBackup()) {
    log('❌ Failed to create backup, aborting for safety');
    removeLock();
    return;
  }
  
  log('🚀 Running incremental update (--incremental flag)...');
  
  const updateProcess = spawn('node', ['scripts/fetch-burn-data.js', '--incremental'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
  
  let stdout = '';
  let stderr = '';
  
  updateProcess.stdout.on('data', (data) => {
    const output = data.toString();
    stdout += output;
    log(`[SCRIPT] ${output.trim()}`);
  });
  
  updateProcess.stderr.on('data', (data) => {
    const output = data.toString();
    stderr += output;
    log(`[ERROR] ${output.trim()}`);
  });
  
  updateProcess.on('close', (code) => {
    removeLock();
    
    if (code === 0) {
      log('✅ Incremental update script completed successfully');
      
      // Post-update validation
      if (validateDataAfterUpdate()) {
        log('✅ Post-update validation passed');
        
        // Copy to public folder for chart display
        copyToPublicFolder();
        
        // Git and Vercel auto-deployment
        performGitAndVercelUpdate();
        
        log('✅ Safe incremental update completed successfully!');
        log(`⏰ Next update scheduled for: ${new Date(Date.now() + UPDATE_INTERVAL_MS).toLocaleString()}`);
        
      } else {
        log('🚨 CRITICAL: Post-update validation failed - performing rollback');
        
        if (rollbackFromBackup()) {
          log('✅ Rollback successful - data integrity preserved');
        } else {
          log('❌ CRITICAL: Rollback failed - manual intervention required');
        }
      }
      
    } else {
      log(`❌ Incremental update script failed with exit code: ${code}`);
      log('🔄 Performing automatic rollback...');
      
      if (rollbackFromBackup()) {
        log('✅ Rollback successful after script failure');
      } else {
        log('❌ CRITICAL: Rollback failed - manual intervention required');
      }
    }
  });
  
  updateProcess.on('error', (error) => {
    log(`❌ Failed to start update process: ${error.message}`);
    removeLock();
    
    if (rollbackFromBackup()) {
      log('✅ Rollback successful after process error');
    }
  });
}

function copyToPublicFolder() {
  try {
    // Copy manifest first
    const manifestSource = path.join(__dirname, '../data/data-manifest.json');
    const manifestDest = path.join(__dirname, '../public/data/data-manifest.json');
    
    if (fs.existsSync(manifestSource)) {
      fs.copyFileSync(manifestSource, manifestDest);
      
      // Read manifest to get latest versioned file
      const manifest = JSON.parse(fs.readFileSync(manifestSource, 'utf8'));
      const versionedSource = path.join(__dirname, '../data', manifest.latest);
      const versionedDest = path.join(__dirname, '../public/data', manifest.latest);
      
      if (fs.existsSync(versionedSource)) {
        fs.copyFileSync(versionedSource, versionedDest);
        log(`✅ Versioned data copied: ${manifest.latest}`);
      }
    }
    
    // Also copy legacy file for backward compatibility
    const legacySource = path.join(__dirname, '../data/burn-data.json');
    const legacyDest = path.join(__dirname, '../public/data/burn-data.json');
    
    if (fs.existsSync(legacySource)) {
      fs.copyFileSync(legacySource, legacyDest);
      log('✅ Legacy data copied to public folder');
    }
    
  } catch (error) {
    log(`❌ Error copying to public folder: ${error.message}`);
  }
}

function performGitAndVercelUpdate() {
  log('📤 Starting git and Vercel auto-deployment...');
  
  try {
    // Git add, commit, and push
    const { execSync } = require('child_process');
    
    // Add data files
    execSync('git add data/ public/data/', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Create commit with timestamp
    const commitMessage = `Auto-update: ${new Date().toLocaleString()}

🔄 Incremental burn data update
✅ Historical data preserved (>48 hours)
📊 Recent data updated with latest burns
👥 Holder data refreshed

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
    
    execSync(`git commit -m "${commitMessage}"`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Push to origin
    execSync('git push origin master', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    log('✅ Git commit and push completed');
    log('🚀 Vercel will auto-deploy from git push');
    
  } catch (error) {
    log(`⚠️  Git/Vercel update failed: ${error.message}`);
    log('🔄 Data update completed, but manual git push may be needed');
  }
}

// Graceful shutdown cleanup
function cleanup() {
  log('🛑 Graceful shutdown initiated...');
  removeLock();
  log('👋 Safe auto-update service stopped');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Initial startup
log('🛡️  Safe auto-update service started successfully');
log('🔒 Historical data protection enabled (dates >48 hours immutable)');

// Run first update immediately (but wait 10 seconds for startup)
setTimeout(() => {
  runSafeIncrementalUpdate();
}, 10000);

// Schedule periodic updates
setInterval(runSafeIncrementalUpdate, UPDATE_INTERVAL_MS);