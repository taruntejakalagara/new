# The Digital Key - Driver App v2.0

A modern, lightweight, venue-customizable valet driver app built with React + Capacitor.

## ✨ What's New in v2.0

### Design Improvements
- **Lightweight UI**: Clean, minimal design that focuses on task completion
- **Touch-optimized**: Large tap targets, smooth animations, native feel
- **CSS Variable theming**: Easy venue customization without code changes
- **Modern typography**: DM Sans with optional display fonts per venue
- **Refined color system**: Cohesive palette with accent colors

### Architecture Improvements
- **Environment-based configuration**: No more hardcoded IPs
- **Context-based state management**: AuthContext, ThemeContext
- **Centralized API config**: Single source of truth for endpoints
- **Modular components**: Reusable UI building blocks
- **TypeScript-ready**: JSDoc typed, easy migration path

### Multi-Venue Theming
Each venue gets a unique visual identity:

| Venue | Primary | Accent | Style |
|-------|---------|--------|-------|
| Default | Slate | Blue | Modern |
| Fairmont | Navy | Gold | Classic/Luxury |
| Kimpton | Teal | Orange | Boutique |
| Ace Hotel | Black | Orange | Minimal/Hip |
| Marriott | Corporate Blue | Red | Professional |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Android Studio (for mobile builds)
- Android device with NFC

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your server IP
VITE_API_URL=http://YOUR_SERVER_IP:4000/api
VITE_CUSTOMER_URL=http://YOUR_SERVER_IP:5172

# Start dev server
npm run dev
```

### Android Build

```bash
# Build web assets
npm run build

# Sync to Android
npm run sync

# Open in Android Studio
npm run android

# Build APK from Android Studio
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── config/
│   ├── api.js          # API endpoints config
│   └── themes.js       # Venue theme definitions
├── context/
│   ├── AuthContext.jsx # Authentication state
│   └── ThemeContext.jsx # Venue theming
├── hooks/              # Custom React hooks
├── pages/
│   ├── LoginPage.jsx
│   ├── Dashboard.jsx
│   ├── NFCCheckInPage.jsx
│   ├── TaskQueuePage.jsx
│   └── PendingHandoverPage.jsx
├── plugins/
│   └── nfc.js          # NFC Capacitor plugin wrapper
├── styles/
│   └── app.css         # Global styles + CSS variables
├── App.jsx             # Main app with routing
└── main.jsx            # Entry point
```

## 🎨 Venue Theming

### Adding a New Venue

1. Edit `src/config/themes.js`:

```javascript
export const venues = {
  // ... existing venues
  
  newhotel: {
    id: 'newhotel',
    name: 'New Hotel Name',
    logo: '/venues/newhotel-logo.png',
    colors: {
      primary: '#123456',
      primaryLight: '#234567',
      accent: '#abcdef',
      // ... other colors
    },
    fonts: {
      display: "'Custom Font', serif",
      body: "'Body Font', sans-serif",
    },
    style: 'modern', // modern, classic, minimal
  },
};
```

2. Set venue on driver login (backend response):
```javascript
// Backend should return venue_id with driver data
{
  success: true,
  driver: {
    id: 1,
    fullName: "John Doe",
    venue_id: "newhotel"  // <-- Theme applied automatically
  }
}
```

### CSS Variables Available

```css
--color-primary       /* Main brand color */
--color-primary-light /* Lighter variant */
--color-accent        /* Action/highlight color */
--color-accent-light  /* Lighter accent */
--color-success       /* Success states */
--color-warning       /* Warning states */
--color-error         /* Error states */
--color-surface       /* Card backgrounds */
--color-surface-alt   /* Page background */
--color-text          /* Primary text */
--color-text-muted    /* Secondary text */
--color-border        /* Border color */
--font-display        /* Headlines */
--font-body           /* Body text */
```

## 📱 NFC Workflow

### Check-In Flow
1. Driver taps "Check In Vehicle"
2. Driver holds blank NFC card to phone
3. App reads card (checks if blank)
4. App assigns hook number
5. App writes customer URL to card
6. Driver gives card to customer
7. Driver enters vehicle details (optional)
8. Driver parks car, records location
9. Driver places key on assigned hook
10. Check-in complete

### Retrieval Flow
1. Customer requests retrieval (scans card or uses app)
2. Request appears in driver queue
3. Driver accepts task
4. Driver finds car using hook number
5. Driver brings car to pickup area
6. Customer arrives with NFC card
7. Driver scans card to verify
8. Card is cleared for reuse
9. Handover complete

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `VITE_CUSTOMER_URL` | Customer app URL | `http://localhost:5172` |
| `VITE_DEFAULT_VENUE` | Default theme | `default` |
| `VITE_DEBUG` | Enable debug mode | `false` |

## 🛠 Development Tips

### Testing NFC on Web
The NFC plugin simulates success on web for testing:
- Read: Returns empty card
- Write: Returns success
- Clear: Returns success

### Hot Reload on Device
```bash
# Start with network access
npm run dev -- --host

# In capacitor.config.json, set:
{
  "server": {
    "url": "http://YOUR_DEV_IP:5174"
  }
}

# Rebuild Android
npm run sync
```

### Debugging
- Enable `VITE_DEBUG=true` for console logging
- Android: Chrome DevTools via `chrome://inspect`
- Check NFC logs: `adb logcat | grep NFC`

## 📋 API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/drivers/login` | POST | Driver authentication |
| `/drivers/logout` | POST | End session |
| `/drivers/stats/:id` | GET | Driver statistics |
| `/hooks/next-available` | GET | Get next hook number |
| `/checkin` | POST | Create vehicle check-in |
| `/queue` | GET | Retrieval request queue |
| `/queue/:id/accept` | POST | Accept retrieval task |
| `/pending-handovers` | GET | Vehicles ready for pickup |
| `/retrieval/:id/collect-cash` | POST | Record cash payment |
| `/retrieval/:id/handover-keys` | POST | Complete handover |
| `/complete-retrieval` | POST | Mark retrieval done |
| `/vehicles/card/:cardId` | GET | Get vehicle by card |

## 📦 Build for Production

```bash
# Build optimized web assets
npm run build

# Sync to Android project
npm run sync

# In Android Studio:
# Build > Generate Signed Bundle / APK
```

## 🔒 Security Notes

- NFC cards contain only a URL, no sensitive data
- Authentication tokens stored in localStorage
- API communication should use HTTPS in production
- Card IDs are randomly generated (non-sequential)

## 📄 License

Proprietary - The Digital Key
