#!/bin/bash

# Office IP: 10.1.10.217
# Home IP: 192.168.12.154

OLD_IP="192.168.12.154"
NEW_IP="10.1.10.217"

echo "Changing IP from $OLD_IP to $NEW_IP..."

# Driver App
if [ -f ~/Downloads/up/driver-app/src/config/api.js ]; then
  sed -i '' "s|$OLD_IP|$NEW_IP|g" ~/Downloads/up/driver-app/src/config/api.js
  echo "✓ Driver app updated"
fi

# Station App
if [ -f ~/Downloads/up/station-app/src/config/api.js ]; then
  sed -i '' "s|$OLD_IP|$NEW_IP|g" ~/Downloads/up/station-app/src/config/api.js
  echo "✓ Station app updated"
fi

# Customer App
if [ -f ~/Downloads/up/customer-app/src/config/api.js ]; then
  sed -i '' "s|$OLD_IP|$NEW_IP|g" ~/Downloads/up/customer-app/src/config/api.js
  echo "✓ Customer app updated"
fi

# Admin Dashboard
if [ -f ~/Downloads/up/admin-dashboard/src/config/api.js ]; then
  sed -i '' "s|$OLD_IP|$NEW_IP|g" ~/Downloads/up/admin-dashboard/src/config/api.js
  echo "✓ Admin dashboard updated"
fi

echo ""
echo "Done! Now rebuild apps:"
echo ""
echo "  cd ~/Downloads/up/driver-app && npm run build && npx cap sync android"
echo "  cd ~/Downloads/up/station-app && npm run build"
echo ""
echo "Backend will auto-detect IP. Just restart:"
echo "  cd ~/Downloads/up/backend && node src/server.js"
