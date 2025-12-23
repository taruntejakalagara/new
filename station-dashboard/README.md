# Fairmont Pittsburgh - Station Dashboard v2.0

A comprehensive valet station management system with manager authentication, driver shift tracking, analytics, and end-of-day closeout.

## ✨ Features

### Core Operations
- **Dashboard** - Real-time stats, alerts, sound notifications for new requests
- **Queue Management** - VIP/Priority handling, driver assignment, customer notification status
- **Hook Board** - Visual 10x5 grid with heatmap, usage suggestions
- **Vehicles** - Search, photo viewing, VIP marking, priority retrieval

### Management
- **Driver Management** - Add/remove drivers, toggle availability, performance stats
- **Shift Tracking** - Clock in/out drivers, track hours, shift performance
- **Manager Login** - Secure authentication with shift configuration

### Reports & Analytics
- **Daily Analytics** - Revenue, retrievals, peak hours, wait times
- **Driver Leaderboard** - Performance ranking, tips earned
- **Revenue Breakdown** - Valet fees vs tips, cash vs card
- **Wait Time Distribution** - Service quality metrics

### End of Day
- **Cash Closeout** - Bill counting, reconciliation
- **Shift Notes** - Handoff information for next shift
- **Variance Tracking** - Over/short reporting

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit VITE_API_URL with your server IP

# Start development server
npm run dev

# Open http://localhost:5175
```

## 📁 Project Structure

```
src/
├── components/
│   └── Sidebar.jsx          # Navigation with shift info
├── config/
│   ├── api.js               # API endpoints & config
│   └── theme.js             # Fairmont branding
├── context/
│   └── AuthContext.jsx      # Manager auth & shift config
├── pages/
│   ├── LoginPage.jsx        # Login + shift setup
│   ├── DashboardPage.jsx    # Main dashboard
│   ├── QueuePage.jsx        # Retrieval queue
│   ├── DriversPage.jsx      # Driver management
│   ├── VehiclesPage.jsx     # Vehicle search
│   ├── HookBoardPage.jsx    # Hook grid + heatmap
│   ├── ShiftsPage.jsx       # Driver shifts
│   ├── AnalyticsPage.jsx    # Reports & charts
│   └── CloseoutPage.jsx     # End of day
├── styles/
│   └── app.css              # Complete styling
├── App.jsx                  # Routes & auth
└── main.jsx                 # Entry point
```

## 🔐 Authentication

Managers log in at shift start and configure:
- **Tip Policy**: Individual (drivers keep) or Pooled (split equally)
- **Pricing Model**: Flat rate, hourly, or tiered/event pricing

Session persists in localStorage until logout.

## 📊 Analytics

| Metric | Description |
|--------|-------------|
| Total Retrievals | Cars retrieved today/week/month |
| Revenue | Valet fees + tips |
| Avg Wait Time | Time from request to delivery |
| Peak Hours | Busiest times (chart) |
| Driver Leaderboard | Rankings by retrievals |
| Wait Distribution | % under 2min, 3min, 5min, etc. |

## 💰 Closeout Process

1. View shift summary (retrievals, revenue)
2. Count cash by denomination
3. System calculates variance
4. Add shift notes for next team
5. Submit closeout

## 🎨 Customizing for Other Venues

To create a version for another hotel:

1. **Copy this project**
2. **Update `src/config/theme.js`**:
   - Change colors (primary, accent)
   - Update fonts if needed
   - Modify venue name

3. **Update `src/styles/app.css`**:
   - Change CSS variables at `:root`
   - Update color palette

4. **Update `index.html`**:
   - Change title
   - Update loading screen branding

5. **Update `.env.example`**:
   - Change venue ID and name

### Color Schemes for Other Venues

**Kimpton** (Boutique):
```css
--color-primary: #0d4b4b;  /* Teal */
--color-accent: #f97316;   /* Orange */
```

**Ace Hotel** (Modern):
```css
--color-primary: #000000;  /* Black */
--color-accent: #f97316;   /* Orange */
```

**Marriott** (Professional):
```css
--color-primary: #1e3a8a;  /* Blue */
--color-accent: #ef4444;   /* Red */
```

## 📡 API Endpoints Required

### Auth
- `POST /managers/login`
- `POST /managers/logout`

### Operations
- `GET /station/stats`
- `GET /queue`
- `POST /queue/:id/assign`
- `POST /queue/:id/cancel`
- `POST /notifications/customer/:id`

### Drivers
- `GET /drivers`
- `POST /drivers/register`
- `POST /drivers/:id/status`
- `DELETE /drivers/:id`

### Shifts
- `GET /shifts/active`
- `POST /shifts/start`
- `POST /shifts/end`

### Vehicles & Hooks
- `GET /vehicles`
- `GET /vehicles/:id/photos`
- `GET /hooks`
- `GET /hooks/stats/summary`
- `GET /hooks/heatmap`
- `POST /hooks/release`

### Analytics
- `GET /analytics/daily`
- `GET /analytics/drivers`

### Closeout
- `GET /closeout/current`
- `POST /closeout/submit`

## 📱 iPad Optimization

- Sidebar navigation (260px)
- Large touch targets
- Landscape orientation focus
- Sound alerts for new requests

## 📄 License

Proprietary - The Digital Key
