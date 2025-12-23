#!/bin/bash

# ============================================
# The Digital Key - Network Configuration
# ============================================
# Usage: ./change-ip.sh <NEW_IP>
# Example: ./change-ip.sh 192.168.1.100
# ============================================

if [ -z "$1" ]; then
  echo ""
  echo "🔧 The Digital Key - Network Configuration"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Usage: ./change-ip.sh <NEW_IP>"
  echo ""
  echo "Example:"
  echo "  ./change-ip.sh 192.168.1.100"
  echo ""
  echo "Current IP detection:"
  echo "  WiFi (en0): $(ipconfig getifaddr en0 2>/dev/null || echo 'Not connected')"
  echo ""
  exit 1
fi

NEW_IP=$1
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🔧 The Digital Key - Network Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Setting API IP to: $NEW_IP"
echo ""

# Update Customer App
echo "📱 Updating Customer App..."
sed -i '' "s/const API_HOST = '[^']*'/const API_HOST = '$NEW_IP'/g" "$BASE_DIR/customer-app/src/config/api.js" 2>/dev/null && echo "  ✓ customer-app/src/config/api.js"

# Update Driver App
echo "🚗 Updating Driver App..."
sed -i '' "s/const API_HOST = '[^']*'/const API_HOST = '$NEW_IP'/g" "$BASE_DIR/driver-app/src/config/api.js" 2>/dev/null && echo "  ✓ driver-app/src/config/api.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ IP updated to: $NEW_IP"
echo ""
echo "Next steps:"
echo "  1. Start backend:       cd backend && npm install && npm start"
echo "  2. Start customer app:  cd customer-app && npm install && npm run dev"
echo "  3. Build driver app:    cd driver-app && npm install && npm run build && npx cap add android && npx cap sync android"
echo ""
echo "Test: curl http://$NEW_IP:4000/api/health"
echo ""
