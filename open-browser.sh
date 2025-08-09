#!/bin/bash
echo "Opening TINC Burn Tracker in your default browser..."
echo "URL: http://localhost:6000"
echo ""
echo "If the browser doesn't open automatically, try these URLs:"
echo "1. http://localhost:6000"
echo "2. http://127.0.0.1:6000"
echo "3. http://172.31.125.140:6000"
echo ""
echo "Server is running on port 6000"

# Try to open in Windows browser from WSL
if command -v cmd.exe &> /dev/null; then
    cmd.exe /c start http://localhost:6000
elif command -v wslview &> /dev/null; then
    wslview http://localhost:6000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:6000
fi