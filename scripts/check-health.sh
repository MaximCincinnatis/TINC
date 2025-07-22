#!/bin/bash
# Simple health check for TINC auto-updates

# Check if service is active
SERVICE_STATUS=$(systemctl is-active tinc-auto-update.service 2>/dev/null)

# Get last update time from git log
LAST_UPDATE=$(git log -1 --grep="Auto-update:" --format="%cr" 2>/dev/null)

# Check if process is running (fallback if no systemd)
PROCESS_RUNNING=$(pgrep -f "node.*run-auto-updates.js" > /dev/null && echo "yes" || echo "no")

echo "=== TINC Auto-Update Health Check ==="
echo "Service Status: $SERVICE_STATUS"
echo "Process Running: $PROCESS_RUNNING"
echo "Last Update: ${LAST_UPDATE:-Never}"

# Check if updates are stale (more than 3 hours old)
if [ -z "$LAST_UPDATE" ]; then
    echo "❌ WARNING: No auto-update commits found!"
    exit 1
elif [[ "$LAST_UPDATE" == *"hour"* ]] && [[ $(echo "$LAST_UPDATE" | grep -o '[0-9]*' | head -1) -gt 3 ]]; then
    echo "❌ WARNING: Updates are stale! Last update was $LAST_UPDATE"
    exit 1
elif [[ "$LAST_UPDATE" == *"day"* ]]; then
    echo "❌ WARNING: Updates are very stale! Last update was $LAST_UPDATE"
    exit 1
else
    echo "✅ Updates are current"
fi