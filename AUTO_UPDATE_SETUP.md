# TINC Auto-Update Setup Guide

## Overview
This guide helps you set up automatic updates for the TINC Burn Tracker to fetch fresh blockchain data periodically.

## Auto-Update Script
The `scripts/auto-update.sh` script will:
1. Run the data fetch script (takes ~10 minutes)
2. Copy updated data to public folder
3. Commit and push changes to GitHub
4. Vercel auto-deploys from GitHub push

## Setup Options

### Option 1: Cron Job (Linux/WSL)
Run every 4 hours:
```bash
# Open crontab
crontab -e

# Add this line (runs at 0:00, 4:00, 8:00, 12:00, 16:00, 20:00)
0 */4 * * * cd /home/wsl/projects/TINC && /bin/bash scripts/auto-update.sh >> logs/auto-update.log 2>&1
```

Run every hour:
```bash
0 * * * * cd /home/wsl/projects/TINC && /bin/bash scripts/auto-update.sh >> logs/auto-update.log 2>&1
```

Run twice daily (noon and midnight):
```bash
0 0,12 * * * cd /home/wsl/projects/TINC && /bin/bash scripts/auto-update.sh >> logs/auto-update.log 2>&1
```

### Option 2: GitHub Actions (Recommended for reliability)
Create `.github/workflows/auto-update.yml`:
```yaml
name: Auto Update TINC Data

on:
  schedule:
    # Runs every 4 hours
    - cron: '0 */4 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Fetch fresh data
        run: node scripts/fetch-burn-data.js
        timeout-minutes: 15
      
      - name: Copy to public
        run: cp data/burn-data.json public/data/burn-data.json
      
      - name: Commit and push
        run: |
          git config --global user.name "TINC Auto Update"
          git config --global user.email "auto-update@tincburner.com"
          git add data/burn-data.json public/data/burn-data.json
          git commit -m "Auto-update: Fresh blockchain data $(date +%Y-%m-%d)" || echo "No changes"
          git push
```

### Option 3: Node.js Scheduler
Create `scripts/auto-update-daemon.js`:
```javascript
const { exec } = require('child_process');
const schedule = require('node-schedule');

// Run every 4 hours
const job = schedule.scheduleJob('0 */4 * * *', function() {
  console.log('🚀 Starting scheduled update:', new Date());
  
  exec('bash scripts/auto-update.sh', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Update failed:', error);
      return;
    }
    console.log('✅ Update output:', stdout);
    if (stderr) console.error('⚠️ Warnings:', stderr);
  });
});

console.log('📅 Auto-update scheduler started. Next run:', job.nextInvocation());
```

Then run: `npm install node-schedule && node scripts/auto-update-daemon.js`

## Manual Test
Test the auto-update script manually:
```bash
cd /home/wsl/projects/TINC
./scripts/auto-update.sh
```

## Monitoring
Create a log directory:
```bash
mkdir -p /home/wsl/projects/TINC/logs
```

Check update logs:
```bash
tail -f /home/wsl/projects/TINC/logs/auto-update.log
```

## Important Notes
- Script takes ~10 minutes to complete (fetches all blockchain data)
- Vercel auto-deploys on GitHub push
- Consider rate limits: Moralis allows generous requests but not unlimited
- Recommended frequency: Every 4-6 hours is reasonable

## Troubleshooting
1. **Permission denied**: Make sure script is executable: `chmod +x scripts/auto-update.sh`
2. **Git push fails**: Ensure you have push access and credentials configured
3. **Data fetch fails**: Check API keys are valid and have remaining quota
4. **Cron not running**: Check cron service is active: `service cron status`
## Truth check, reorg depth, prune and log rotation (2026-09-09)

The publish-health cron (`~/.local/bin/publish-health-check.sh`, every 30 min) proves the tracker is
publishing. `scripts/truth-check.js` proves the numbers: once a day (cron 05:20 local, log in
`~/.local/state/tinc-truth.log`, status in `tinc-truth.status`) it recounts the live snapshot's whole
window from the node (burns and mints per UTC day, hash by hash), checks the arithmetic the page relies
on (`totalBurned`, `burnPercentage`, `mintedInWindow`, `supplyChange`, `totalSupply` against the chain),
the head lag of the live snapshot, the presence of the protocol facts the page reads, and the
AccessManager's role holders (RoleGranted / RoleRevoked, code size, execution delay,
`FarmKeeper.authority()`). Any problem goes through `~/.local/bin/dashboard-alert.sh` (Telegram ops
chat + desktop popup), the same path the publish-health cron uses. Run it by hand with
`node scripts/truth-check.js` (add `--json <file>` for a local snapshot, `--no-alert` to stay quiet).

The incremental fetch stops two blocks short of the head and re-scans the last five processed blocks
each cycle (`REORG_DEPTH`, `RESCAN_BLOCKS` in `fetch-burn-data.js`); merges are keyed by hash, so the
re-scan adds nothing twice. `prune-burn-snapshots.js` keeps five versioned snapshots by default
(`BURN_SNAPSHOT_KEEP` overrides). `/etc/logrotate.d/tinc-tracker` rotates the two service logs weekly
or at 20 MB with copytruncate, eight rotations kept.
