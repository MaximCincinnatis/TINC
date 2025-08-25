#!/bin/bash

# TINC Auto-Update Service Startup Script
# This script starts the safe auto-update service if it's not already running

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if already running
if pgrep -f "safe-auto-updates.js" > /dev/null; then
    echo "Auto-update service is already running"
    exit 0
fi

# Start the service
cd "$PROJECT_DIR"
nohup node scripts/safe-auto-updates.js >> logs/safe-auto-update.log 2>&1 &
echo "Auto-update service started with PID: $!"