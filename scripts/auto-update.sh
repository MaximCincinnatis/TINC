#!/bin/bash

# TINC Burn Tracker Auto-Update Script
# This script runs the data fetch and auto-deploys to Vercel

echo "🚀 Starting TINC auto-update: $(date)"

# Navigate to project directory
cd /home/wsl/projects/TINC

# Run the gap-resistant integrated update
echo "📊 Running gap-resistant update with backfill..."
node scripts/integrated-gap-resistant-update.js

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
    
    # Trigger Vercel deployment
    echo "🚀 Triggering Vercel deployment..."
    node scripts/trigger-vercel-deploy.js
    
    if [ $? -eq 0 ]; then
        echo "✅ Auto-update and deployment complete: $(date)"
    else
        echo "⚠️  Git push succeeded but Vercel deployment trigger failed"
        echo "✅ Auto-update complete: $(date)"
    fi
else
    echo "❌ Data fetch failed: $(date)"
    exit 1
fi