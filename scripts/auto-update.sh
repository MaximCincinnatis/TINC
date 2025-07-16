#!/bin/bash

# TINC Burn Tracker Auto-Update Script
# This script runs the data fetch and auto-deploys to Vercel

echo "🚀 Starting TINC auto-update: $(date)"

# Navigate to project directory
cd /home/wsl/projects/TINC

# Run the fetch script (this takes 8-10 minutes)
echo "📊 Fetching fresh blockchain data..."
node scripts/fetch-burn-data.js

# Check if fetch was successful
if [ $? -eq 0 ]; then
    echo "✅ Data fetch successful"
    
    # Copy to public folder
    cp data/burn-data.json public/data/burn-data.json
    
    # Git operations
    echo "📤 Committing and pushing updates..."
    git add data/burn-data.json public/data/burn-data.json
    git commit -m "Auto-update: Fresh blockchain data $(date +%Y-%m-%d_%H:%M)

- Updated burn data
- Updated holder counts via Moralis API
- Automated update via cron job"
    
    git push origin master
    
    echo "✅ Auto-update complete: $(date)"
else
    echo "❌ Data fetch failed: $(date)"
    exit 1
fi