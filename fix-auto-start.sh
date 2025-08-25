#!/bin/bash
# TINC Auto-Start Fix Script
# ==========================
# Purpose: Fix and enable auto-start for TINC burn tracker
# Created: August 25, 2025
# 
# This script will:
# 1. Update systemd service with correct script path
# 2. Add extensive comments for clarity
# 3. Enable auto-start on boot
# 4. Restart the service properly

echo "🔧 TINC Auto-Start Fix Script"
echo "=============================="
echo ""

# Step 1: Create properly commented service file
echo "📝 Creating updated service file with comments..."
cat > /tmp/tinc-auto-update.service << 'EOF'
# TINC Burn Tracker Auto-Update Service
# ==========================================
# Purpose: Automatically updates TINC burn data every 30 minutes
# Created: July 2025
# Updated: August 25, 2025
# 
# CRITICAL: This service ensures continuous data collection
# - Fetches new burn transactions using block-based tracking
# - Updates token holder statistics
# - Commits and pushes to Git (triggers Vercel deployment)
# - Runs every 30 minutes via internal timer
#
# DEPENDENCIES:
# - Node.js installed at /usr/bin/node
# - Git configured with credentials
# - safe-auto-updates.js script (NOT run-auto-updates.js)
#
# DEPRECATED: run-auto-updates.js was the old script
# CURRENT: safe-auto-updates.js includes data validation and rollback

[Unit]
Description=TINC Burn Tracker Auto-Update Service (Block-Based)
After=network.target
# Ensures network is available before starting

[Service]
Type=simple
User=wsl
WorkingDirectory=/home/wsl/projects/TINC

# CRITICAL FIX: Changed from run-auto-updates.js to safe-auto-updates.js
# OLD (BROKEN): ExecStart=/usr/bin/node /home/wsl/projects/TINC/scripts/run-auto-updates.js
# NEW (FIXED): Uses safe-auto-updates.js with block-based tracking
ExecStart=/usr/bin/node /home/wsl/projects/TINC/scripts/safe-auto-updates.js

# Auto-restart configuration
Restart=always
RestartSec=60
# Will restart after 60 seconds if service crashes

# Logging configuration
StandardOutput=append:/home/wsl/projects/TINC/logs/auto-update.log
StandardError=append:/home/wsl/projects/TINC/logs/auto-update.log
# All output appended to log file for debugging

# Environment (if needed for RPC endpoints)
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
# Starts automatically when system reaches multi-user target (normal boot)
EOF

# Step 2: Backup old service file
echo "💾 Backing up old service file..."
sudo cp /etc/systemd/system/tinc-auto-update.service /etc/systemd/system/tinc-auto-update.service.old 2>/dev/null

# Step 3: Install new service file
echo "📦 Installing updated service file..."
sudo cp /tmp/tinc-auto-update.service /etc/systemd/system/tinc-auto-update.service

# Step 4: Reload systemd daemon
echo "🔄 Reloading systemd configuration..."
sudo systemctl daemon-reload

# Step 5: Stop any running manual process
echo "🛑 Stopping manual process if running..."
pkill -f "node scripts/safe-auto-updates.js" 2>/dev/null || true
pkill -f "node scripts/run-auto-updates.js" 2>/dev/null || true

# Step 6: Enable service for auto-start
echo "⚙️  Enabling service for auto-start on boot..."
sudo systemctl enable tinc-auto-update.service

# Step 7: Start the service
echo "🚀 Starting TINC auto-update service..."
sudo systemctl start tinc-auto-update.service

# Step 8: Verify status
echo ""
echo "✅ Checking service status..."
echo "================================"
sudo systemctl status tinc-auto-update.service --no-pager

echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Service file updated with correct script path"
echo "✅ Extensive comments added for documentation"
echo "✅ Service enabled for auto-start on boot"
echo "✅ Service started via systemd"
echo ""
echo "🔍 Verification commands:"
echo "  systemctl status tinc-auto-update.service"
echo "  systemctl is-enabled tinc-auto-update.service"
echo "  journalctl -u tinc-auto-update.service -f"
echo ""
echo "📝 Log file location:"
echo "  /home/wsl/projects/TINC/logs/auto-update.log"
echo ""
echo "🔄 The service will:"
echo "  - Start automatically on boot"
echo "  - Update burn data every 30 minutes"
echo "  - Push to Git (triggers Vercel deployment)"
echo "  - Restart automatically if it crashes"