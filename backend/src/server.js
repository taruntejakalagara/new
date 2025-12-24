const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'valet.db');
const db = new Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      address TEXT,
      phone TEXT,
      max_hooks INTEGER DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'offline',
      venue_id INTEGER DEFAULT 1,
      current_task TEXT,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS managers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'manager',
      venue_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS hooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hook_number INTEGER NOT NULL,
      venue_id INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available',
      UNIQUE(hook_number, venue_id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_card_id TEXT UNIQUE,
      license_plate TEXT,
      make TEXT,
      model TEXT,
      color TEXT,
      hook_number INTEGER,
      venue_id INTEGER DEFAULT 1,
      status TEXT DEFAULT 'parked',
      checked_in_by INTEGER,
      checked_out_by INTEGER,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      unique_card_id TEXT,
      license_plate TEXT,
      hook_number INTEGER,
      status TEXT DEFAULT 'pending',
      is_priority INTEGER DEFAULT 0,
      amount REAL DEFAULT 0,
      tip REAL DEFAULT 0,
      payment_method TEXT,
      assigned_driver_id INTEGER,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_at DATETIME,
      completed_at DATETIME,
      venue_id INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS daily_closeouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      venue_id INTEGER DEFAULT 1,
      total_vehicles INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      cash_collected REAL DEFAULT 0,
      card_collected REAL DEFAULT 0,
      tips_collected REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize default hooks (1-50)
  const hookCount = db.prepare('SELECT COUNT(*) as count FROM hooks').get();
  if (hookCount.count === 0) {
    const insertHook = db.prepare('INSERT OR IGNORE INTO hooks (hook_number, venue_id) VALUES (?, 1)');
    for (let i = 1; i <= 50; i++) {
      insertHook.run(i);
    }
  }

  // Create default venue if none exists
  const venueCount = db.prepare('SELECT COUNT(*) as count FROM venues').get();
  if (venueCount.count === 0) {
    db.prepare(`INSERT INTO venues (name, slug, max_hooks) VALUES (?, ?, ?)`).run(
      'Fairmont Pittsburgh', 'fairmont-pittsburgh', 50
    );
  }

  console.log('✓ Database schema initialized');
}

initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Attach database to requests
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Also make db available via app
app.locals.db = db;
app.set('db', db);

// ============================================
// AUTH ROUTES
// ============================================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ============================================
// MAIN API ROUTES (includes /request, /checkin, /vehicles, etc.)
// ============================================
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// ============================================
// DRIVERS ROUTES
// ============================================
const driversRoutes = require('./routes/drivers');
app.use('/api/drivers', driversRoutes);

// ============================================
// MANAGERS ROUTES
// ============================================
const managersRoutes = require('./routes/managers');
app.use('/api/managers', managersRoutes);

// ============================================
// HOOKS ROUTES
// ============================================
app.get('/api/hooks', (req, res) => {
  try {
    const hooks = db.prepare(`
      SELECT h.*, v.license_plate, v.unique_card_id, v.status as vehicle_status
      FROM hooks h
      LEFT JOIN vehicles v ON h.hook_number = v.hook_number AND v.status = 'parked'
      ORDER BY h.hook_number
    `).all();
    res.json({ success: true, hooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/hooks/available', (req, res) => {
  try {
    const usedHooks = db.prepare(`SELECT DISTINCT hook_number FROM vehicles WHERE status = 'parked'`).all();
    const usedNumbers = usedHooks.map(h => h.hook_number);
    const allHooks = db.prepare('SELECT hook_number FROM hooks ORDER BY hook_number').all();
    const available = allHooks.filter(h => !usedNumbers.includes(h.hook_number));
    res.json({ success: true, available: available.map(h => h.hook_number) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// VEHICLES ROUTES
// ============================================

// Hook stats
app.get('/api/hooks/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM hooks').get().count;
    const occupied = db.prepare(`SELECT COUNT(DISTINCT hook_number) as count FROM vehicles WHERE status = 'parked'`).get().count;
    const available = total - occupied;
    res.json({ 
      success: true, 
      stats: { total, available, occupied, reserved: 0 } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hook heatmap (usage frequency)
app.get('/api/hooks/heatmap', (req, res) => {
  try {
    const usage = db.prepare(`
      SELECT hook_number, COUNT(*) as count 
      FROM vehicles 
      WHERE hook_number IS NOT NULL 
      GROUP BY hook_number
    `).all();
    const heatmap = {};
    usage.forEach(u => { heatmap[u.hook_number] = u.count; });
    res.json({ success: true, heatmap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Release hook (mark vehicle as departed)
app.post('/api/hooks/release', (req, res) => {
  try {
    const { hook_number } = req.body;
    db.prepare(`
      UPDATE vehicles 
      SET status = 'departed', check_out_time = CURRENT_TIMESTAMP 
      WHERE hook_number = ? AND status = 'parked'
    `).run(hook_number);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vehicles', (req, res) => {
  try {
    const vehicles = db.prepare(`SELECT * FROM vehicles WHERE status = 'parked' ORDER BY check_in_time DESC`).all();
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vehicles/:cardId', (req, res) => {
  try {
    const vehicle = db.prepare(`SELECT * FROM vehicles WHERE unique_card_id = ? AND status = 'parked'`).get(req.params.cardId);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vehicles/checkin', (req, res) => {
  try {
    const { unique_card_id, license_plate, make, model, color, hook_number, checked_in_by, notes } = req.body;
    
    const result = db.prepare(`
      INSERT INTO vehicles (unique_card_id, license_plate, make, model, color, hook_number, checked_in_by, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'parked')
    `).run(unique_card_id, license_plate, make, model, color, hook_number, checked_in_by, notes);
    
    res.json({ success: true, vehicleId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/vehicles/checkout', (req, res) => {
  try {
    const { unique_card_id, checked_out_by } = req.body;
    
    db.prepare(`
      UPDATE vehicles 
      SET status = 'retrieved', check_out_time = CURRENT_TIMESTAMP, checked_out_by = ?
      WHERE unique_card_id = ? AND status = 'parked'
    `).run(checked_out_by, unique_card_id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// QUEUE ROUTES
// ============================================
app.get('/api/queue', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT q.*, d.fullName as driver_name
      FROM queue q
      LEFT JOIN drivers d ON q.driver_id = d.id
      ORDER BY q.is_priority DESC, q.requested_at ASC
    `).all();
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/queue/request', (req, res) => {
  try {
    const { vehicle_id, unique_card_id, license_plate, hook_number, is_priority, amount, tip, payment_method } = req.body;
    
    const result = db.prepare(`
      INSERT INTO queue (vehicle_id, unique_card_id, license_plate, hook_number, is_priority, amount, tip, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(vehicle_id, unique_card_id, license_plate, hook_number, is_priority ? 1 : 0, amount || 0, tip || 0, payment_method);
    
    res.json({ success: true, requestId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/queue/:id/assign', (req, res) => {
  try {
    const { driver_id } = req.body;
    db.prepare(`UPDATE queue SET driver_id = ?, updated_at = CURRENT_TIMESTAMP, status = 'assigned' WHERE id = ?`).run(driver_id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/queue/:id/complete', (req, res) => {
  try {
    db.prepare(`UPDATE queue SET completed_at = CURRENT_TIMESTAMP, status = 'completed' WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/queue/:id', (req, res) => {
  try {
    db.prepare(`DELETE FROM queue WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// STATS ROUTES
// ============================================
app.get('/api/stats', (req, res) => {
  try {
    const parked = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'`).get().count;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const checkins = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE check_in_time >= ?`).get(todayStart.toISOString()).count;
    const retrievals = db.prepare(`SELECT COUNT(*) as count FROM vehicles WHERE check_out_time >= ?`).get(todayStart.toISOString()).count;
    const pending = db.prepare(`SELECT COUNT(*) as count FROM queue WHERE status = 'pending'`).get().count;
    
    res.json({
      success: true,
      parked,
      today: {
        checkins,
        retrievals,
        pending,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// VENUES ROUTES
// ============================================
app.get('/api/venues', (req, res) => {
  try {
    const venues = db.prepare(`SELECT * FROM venues`).all();
    res.json({ success: true, venues });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// CARDS/NFC ROUTES
// ============================================
app.get('/api/cards/:cardId', (req, res) => {
  try {
    const vehicle = db.prepare(`SELECT * FROM vehicles WHERE unique_card_id = ? AND status = 'parked'`).get(req.params.cardId);
    if (!vehicle) {
      return res.json({ success: true, vehicle: null, exists: false });
    }
    res.json({ success: true, vehicle, exists: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/cards/:cardId/clear', (req, res) => {
  try {
    const vehicle = db.prepare(`SELECT * FROM vehicles WHERE unique_card_id = ? AND status = 'parked'`).get(req.params.cardId);
    if (vehicle) {
      return res.status(400).json({ success: false, error: 'Cannot clear card with active vehicle' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
const os = require('os');
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

const LOCAL_IP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚗 Valet Backend Server Running!\n');
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${LOCAL_IP}:${PORT}`);
  console.log(`  Health:   http://${LOCAL_IP}:${PORT}/api/health`);
  console.log('\n✓ Ready!\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  db.close();
  process.exit(0);
});
