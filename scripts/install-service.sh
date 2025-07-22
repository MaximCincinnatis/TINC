#!/bin/bash
# Install systemd service for TINC auto-updates

echo "Installing TINC auto-update systemd service..."

# Copy service file to systemd directory
sudo cp tinc-auto-update.service /etc/systemd/system/

# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable tinc-auto-update.service

# Start the service
sudo systemctl start tinc-auto-update.service

# Show status
sudo systemctl status tinc-auto-update.service

echo "Service installed! Check status with: sudo systemctl status tinc-auto-update"