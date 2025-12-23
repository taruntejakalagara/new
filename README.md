# The Digital Key - Phase 1 Package

Multi-venue valet parking system with NFC card integration.

## Quick Start

### 1. Set Your Network IP

```bash
# Find your IP
ipconfig getifaddr en0

# Update all apps with your IP
chmod +x change-ip.sh
./change-ip.sh YOUR_IP_HERE
```

### 2. Start Backend

```bash
cd backend
npm install
npm start
```

You should see:
```
🚀 The Digital Key - Valet API
✓ Network: http://YOUR_IP:4000
✓ Ready!
```

### 3. Start Customer App

```bash
cd customer-app
npm install
npm run dev
```

Access at: `http://YOUR_IP:5173`

### 4. Build Driver App (Android)

```bash
cd driver-app
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Then build APK in Android Studio.

## Project Structure

```
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── server.js       # Main server (auto-detects IP)
│   │   ├── config/
│   │   │   ├── hooks.js    # Hook board management
│   │   │   └── venues.js   # Multi-venue configuration
│   │   └── routes/
│   │       └── api.js      # All API endpoints
│   └── package.json
│
├── customer-app/           # Guest-facing web app
│   ├── src/
│   │   ├── config/
│   │   │   ├── api.js      # 👈 Change IP here
│   │   │   ├── venue.js    # Venue branding
│   │   │   └── amenities.js
│   │   └── pages/
│   └── package.json
│
├── driver-app/             # Driver mobile app (Capacitor)
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js      # 👈 Change IP here
│   │   ├── pages/
│   │   └── plugins/
│   │       └── nfc.js      # NFC operations
│   └── package.json
│
└── change-ip.sh            # Script to update IP in all apps
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/system/info` | GET | System info (IP, uptime) |
| `/api/venues` | GET | List all venues |
| `/api/venue/:id/config` | GET | Venue configuration |
| `/api/checkin` | POST | Check in vehicle |
| `/api/vehicles` | GET | List vehicles |
| `/api/request` | POST | Request retrieval |
| `/api/queue` | GET | Retrieval queue |
| `/api/stats` | GET | Statistics |
| `/api/drivers` | GET | List drivers |
| `/api/hooks` | GET | Hook board status |

## Switching Networks

When you change WiFi networks:

1. Get new IP: `ipconfig getifaddr en0`
2. Run: `./change-ip.sh NEW_IP`
3. Restart backend: `cd backend && npm start`
4. Restart customer app: `cd customer-app && npm run dev`
5. Rebuild driver app: `cd driver-app && npm run build && npx cap sync android`

## Venue Configuration

Venues are configured in `backend/src/config/venues.js`. Default venues:

- **Fairmont Pittsburgh** (venue_id: 1)
- **Kimpton Hotel Monaco** (venue_id: 2)
- **Ace Hotel Pittsburgh** (venue_id: 3)

Each venue has:
- Branding (colors, logo, fonts)
- Settings (hooks count, hours, features)
- Pricing (base fee, priority fee)
- Contact info

## Troubleshooting

### "Connection failed" error
- Check if backend is running
- Verify IP address matches in all config files
- Check if phone/browser is on same WiFi network

### NFC not working on Android
- Ensure NFC is enabled in phone settings
- Check that the app has NFC permission
- Make sure `nfc_tech_filter.xml` exists in `android/app/src/main/res/xml/`

### Backend errors
- Check terminal for error messages
- Common: Column name mismatches (use `d.fullName` not `d.name`)
- Run: `curl http://YOUR_IP:4000/api/health` to test

## Next Steps (Phase 2)

- [ ] Admin Dashboard with real-time monitoring
- [ ] Multi-venue management UI
- [ ] Analytics & reporting
- [ ] Cloud deployment
- [ ] Separate branded app builds

---

**The Digital Key** - Luxury Valet Technology
