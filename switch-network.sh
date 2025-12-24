#!/bin/bash

# ========================================
# VALET NETWORK SWITCH SCRIPT
# Run this when you change WiFi networks
# ========================================

# Get current IP
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')

if [ -z "$IP" ]; then
  echo "❌ Could not detect IP address"
  exit 1
fi

echo "🌐 Detected IP: $IP"

# Update /etc/hosts
echo "📝 Updating /etc/hosts..."
sudo sed -i '' '/valet.local/d' /etc/hosts 2>/dev/null || sudo sed -i '/valet.local/d' /etc/hosts
echo "$IP    valet.local" | sudo tee -a /etc/hosts > /dev/null

# Update all api.js files
echo "📝 Updating api.js in all apps..."
APPS_DIR=~/Downloads/up

for app in station-dashboard driver-app customer-app admin-dashboard; do
  CONFIG="$APPS_DIR/$app/src/config/api.js"
  if [ -f "$CONFIG" ]; then
    # Replace the API_HOST line
    sed -i '' "s/const API_HOST = .*/const API_HOST = 'valet.local';/" "$CONFIG" 2>/dev/null || \
    sed -i "s/const API_HOST = .*/const API_HOST = 'valet.local';/" "$CONFIG"
    echo "  ✓ Updated $app"
  fi
done

# Clear Vite caches
echo "🧹 Clearing caches..."
for app in station-dashboard driver-app customer-app admin-dashboard; do
  rm -rf "$APPS_DIR/$app/node_modules/.vite" 2>/dev/null
done

echo ""
echo "✅ Done! Now restart your apps:"
echo ""
echo "  cd ~/Downloads/up/backend && node src/server.js"
echo "  cd ~/Downloads/up/station-dashboard && npm run dev"
echo "  cd ~/Downloads/up/driver-app && npm run dev"
echo ""
echo "🔗 Backend: http://valet.local:4000"
echo "🔗 Station: http://valet.local:5175"
echo "🔗 Driver:  http://valet.local:5173"
echo ""
