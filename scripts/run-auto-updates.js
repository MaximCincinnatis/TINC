const { spawn } = require('child_process');
const path = require('path');

// Configuration
const UPDATE_INTERVAL_MINUTES = 120; // Update every 2 hours
const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_MINUTES * 60 * 1000;

console.log(`
🚀 TINC Auto-Update Service Started
==================================
Update Frequency: Every ${UPDATE_INTERVAL_MINUTES} minutes
Next Update: ${new Date(Date.now() + UPDATE_INTERVAL_MS).toLocaleString()}

Press Ctrl+C to stop
`);

function runUpdate() {
  console.log('\n📊 Starting update:', new Date().toLocaleString());
  
  const updateProcess = spawn('node', ['scripts/fetch-burn-data.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });

  updateProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Data fetch successful, copying to public folder...');
      
      // Copy to public folder
      const fs = require('fs');
      const source = path.join(__dirname, '../data/burn-data.json');
      const dest = path.join(__dirname, '../public/data/burn-data.json');
      
      try {
        fs.copyFileSync(source, dest);
        console.log('✅ Data copied to public folder');
        
        // Git operations
        console.log('📤 Committing and pushing...');
        const gitAdd = spawn('git', ['add', 'data/burn-data.json', 'public/data/burn-data.json'], {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit'
        });
        
        gitAdd.on('close', () => {
          const gitCommit = spawn('git', ['commit', '-m', `Auto-update: ${new Date().toLocaleString()}`], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
          });
          
          gitCommit.on('close', () => {
            const gitPush = spawn('git', ['push', 'origin', 'master'], {
              cwd: path.join(__dirname, '..'),
              stdio: 'inherit'
            });
            
            gitPush.on('close', () => {
              console.log('✅ Update complete!');
              console.log(`⏰ Next update scheduled for: ${new Date(Date.now() + UPDATE_INTERVAL_MS).toLocaleString()}\n`);
            });
          });
        });
        
      } catch (error) {
        console.error('❌ Error copying file:', error.message);
      }
    } else {
      console.error('❌ Data fetch failed with code:', code);
      console.log(`⏰ Will retry at: ${new Date(Date.now() + UPDATE_INTERVAL_MS).toLocaleString()}\n`);
    }
  });
}

// Run immediately on start
runUpdate();

// Schedule periodic updates
setInterval(runUpdate, UPDATE_INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Auto-update service stopped');
  process.exit(0);
});