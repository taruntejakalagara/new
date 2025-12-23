const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

// Load environment variables if .env exists
try {
  require('dotenv').config();
} catch (err) {
  // No .env file, using defaults
}

// Get local IP address automatically
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 4000;
const LOCAL_IP = getLocalIP();

// VERY PERMISSIVE CORS for Android WebView compatibility
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  credentials: true,
  maxAge: 86400
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const Database = require('better-sqlite3');
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'valet.db');
const db = new Database(dbPath);
app.set('db', db);

// Initialize core database schema
db.exec(`
  -- Venues table
  CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Insert default venue if not exists
  INSERT OR IGNORE INTO venues (id, name, slug) VALUES (1, 'Fairmont Pittsburgh', 'fairmont-pittsburgh');

  -- Drivers table
  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullName TEXT,
    phone TEXT,
    email TEXT,
    licenseNumber TEXT,
    vehicleInfo TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT DEFAULT (datetime('now')),
    lastLogin TEXT,
    venue_id INTEGER DEFAULT 1
  );

  -- Vehicles table
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT UNIQUE NOT NULL,
    sequence_number INTEGER,
    hook_number INTEGER,
    license_plate TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    year INTEGER,
    customer_phone TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'parked',
    checked_in_by INTEGER,
    checked_out_by INTEGER,
    check_in_time TEXT DEFAULT (datetime('now')),
    check_out_time TEXT,
    notes TEXT,
    venue_id INTEGER DEFAULT 1,
    FOREIGN KEY (checked_in_by) REFERENCES drivers(id),
    FOREIGN KEY (checked_out_by) REFERENCES drivers(id)
  );

  -- Retrieval requests table
  CREATE TABLE IF NOT EXISTS retrieval_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT NOT NULL,
    vehicle_id INTEGER,
    is_priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    assigned_driver_id INTEGER,
    payment_method TEXT,
    amount REAL,
    tip_amount REAL DEFAULT 0,
    payment_processed INTEGER DEFAULT 0,
    requested_at TEXT DEFAULT (datetime('now')),
    assigned_at TEXT,
    car_ready_at TEXT,
    keys_handed_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    cancel_reason TEXT,
    venue_id INTEGER DEFAULT 1,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_vehicles_card ON vehicles(unique_card_id);
  CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
  CREATE INDEX IF NOT EXISTS idx_requests_card ON retrieval_requests(unique_card_id);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON retrieval_requests(status);
`);

console.log('✓ Database schema initialized');

// Initialize Hook Manager
const HookManager = require('./config/hooks');
const hookManager = new HookManager(db);
app.set('hookManager', hookManager);

// Initialize Venue Config
const { VenueConfig } = require('./config/venues');
const venueConfig = new VenueConfig(db);
venueConfig.initialize();
app.set('venueConfig', venueConfig);

// Import routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
const driversRoutes = require('./routes/drivers');
app.use('/api/drivers', driversRoutes);
const hooksRoutes = require('./routes/hooks');
app.use('/api/hooks', hooksRoutes);
const managersRoutes = require('./routes/managers');
app.use('/api/managers', managersRoutes);

// Venue config endpoint
app.get('/api/venue/:venueId/config', (req, res) => {
  const { venueId } = req.params;
  const config = venueConfig.getById(parseInt(venueId));
  res.json({ success: true, config });
});

app.get('/api/venue/slug/:slug/config', (req, res) => {
  const { slug } = req.params;
  const config = venueConfig.getBySlug(slug);
  res.json({ success: true, config });
});

app.get('/api/venues', (req, res) => {
  const venues = venueConfig.getAll();
  res.json({ success: true, venues });
});

// System info endpoint (for admin dashboard)
app.get('/api/system/info', (req, res) => {
  res.json({
    success: true,
    system: {
      ip: LOCAL_IP,
      port: PORT,
      apiUrl: `http://${LOCAL_IP}:${PORT}`,
      wsUrl: `ws://${LOCAL_IP}:${PORT}`,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'The Digital Key API',
    version: '2.0.0',
    status: 'running',
    ip: LOCAL_IP,
    port: PORT
  });
});

// Start server on all interfaces (0.0.0.0) so it's accessible from network
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 The Digital Key - Valet API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ Database connected');
  console.log('✓ Schema initialized');
  console.log('✓ Venue config loaded');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Network: http://${LOCAL_IP}:${PORT}`);
  console.log('✓ CORS: ENABLED (permissive for Android)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('API Endpoints:');
  console.log(`  Health:    GET  http://${LOCAL_IP}:${PORT}/api/health`);
  console.log(`  System:    GET  http://${LOCAL_IP}:${PORT}/api/system/info`);
  console.log(`  Venues:    GET  http://${LOCAL_IP}:${PORT}/api/venues`);
  console.log(`  Check-in:  POST http://${LOCAL_IP}:${PORT}/api/checkin`);
  console.log(`  Vehicles:  GET  http://${LOCAL_IP}:${PORT}/api/vehicles`);
  console.log(`  Request:   POST http://${LOCAL_IP}:${PORT}/api/request`);
  console.log(`  Queue:     GET  http://${LOCAL_IP}:${PORT}/api/queue`);
  console.log(`  Stats:     GET  http://${LOCAL_IP}:${PORT}/api/stats`);
  console.log('\n✓ Ready!\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close();
  process.exit(0);
});
