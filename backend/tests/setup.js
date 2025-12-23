/**
 * Test Setup
 * Creates an isolated Express app instance for testing
 */
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Create a test database with fresh schema
 */
function createTestDb() {
  const testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
  const db = new Database(testDbPath);
  
  // Initialize schema
  db.exec(`
    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    INSERT INTO settings (key, value) VALUES 
      ('base_fee', '15'),
      ('priority_fee', '10'),
      ('hourly_rate', '5'),
      ('surge_multiplier', '1.0'),
      ('surge_enabled', 'false'),
      ('max_hooks', '50');
    
    -- Drivers
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
      lastLogin TEXT
    );
    
    -- Vehicles
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_card_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      hook_number INTEGER NOT NULL,
      license_plate TEXT NOT NULL,
      make TEXT DEFAULT 'Unknown',
      model TEXT DEFAULT 'Unknown',
      color TEXT,
      year TEXT,
      customer_phone TEXT,
      customer_name TEXT,
      status TEXT DEFAULT 'parked',
      checked_in_by INTEGER,
      checked_out_by INTEGER,
      check_in_time TEXT DEFAULT (datetime('now')),
      check_out_time TEXT,
      notes TEXT
    );
    
    -- Hooks
    CREATE TABLE IF NOT EXISTS hooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hook_number INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'available',
      reserved_for_card TEXT,
      reserved_at TEXT,
      vehicle_id INTEGER
    );
    
    -- Initialize 50 hooks
    ${Array.from({length: 50}, (_, i) => 
      `INSERT INTO hooks (hook_number, status) VALUES (${i + 1}, 'available');`
    ).join('\n')}
    
    -- Retrieval Requests
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
      cancel_reason TEXT
    );
    
    -- Daily Closeouts
    CREATE TABLE IF NOT EXISTS daily_closeouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_checkins INTEGER DEFAULT 0,
      total_retrievals INTEGER DEFAULT 0,
      cash_revenue REAL DEFAULT 0,
      card_revenue REAL DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_tips REAL DEFAULT 0,
      avg_wait_time REAL,
      closed_by TEXT,
      closed_at TEXT,
      notes TEXT
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers(username);
    CREATE INDEX IF NOT EXISTS idx_vehicles_card_id ON vehicles(unique_card_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON retrieval_requests(status);
  `);
  
  return { db, path: testDbPath };
}

/**
 * Create an Express app for testing
 */
function createTestApp(db) {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Make db available
  app.set('db', db);
  
  // Mock hookManager
  const hookManager = {
    getNextAvailableHook: () => {
      const hook = db.prepare("SELECT hook_number FROM hooks WHERE status = 'available' ORDER BY hook_number LIMIT 1").get();
      return hook ? hook.hook_number : null;
    },
    assignHook: (hookNumber, cardId) => {
      db.prepare("UPDATE hooks SET status = 'occupied', reserved_for_card = ? WHERE hook_number = ?").run(cardId, hookNumber);
    },
    releaseHook: (hookNumber) => {
      db.prepare("UPDATE hooks SET status = 'available', reserved_for_card = NULL WHERE hook_number = ?").run(hookNumber);
    }
  };
  app.set('hookManager', hookManager);
  
  // Mock io (Socket.io)
  app.set('io', {
    emit: () => {},
    to: () => ({ emit: () => {} })
  });
  
  // Routes
  const apiRoutes = require('../src/routes/index');
  app.use('/api', apiRoutes);
  
  return app;
}

/**
 * Clean up test database
 */
function cleanupTestDb(testDbPath) {
  try {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  } catch (err) {
    console.error('Error cleaning up test db:', err);
  }
}

/**
 * Create a test driver
 */
function createTestDriver(db, overrides = {}) {
  const bcrypt = require('bcryptjs');
  const defaults = {
    username: `testdriver_${Date.now()}`,
    password: bcrypt.hashSync('password123', 10),
    fullName: 'Test Driver',
    phone: '555-1234',
    email: 'test@example.com',
    status: 'active'
  };
  
  const driver = { ...defaults, ...overrides };
  
  const result = db.prepare(`
    INSERT INTO drivers (username, password, fullName, phone, email, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(driver.username, driver.password, driver.fullName, driver.phone, driver.email, driver.status);
  
  return { id: result.lastInsertRowid, ...driver };
}

/**
 * Create a test vehicle
 */
function createTestVehicle(db, overrides = {}) {
  const defaults = {
    unique_card_id: `CARD_${Date.now()}`,
    license_plate: 'TEST123',
    make: 'Tesla',
    model: 'Model S',
    color: 'Black',
    hook_number: 1,
    sequence_number: 1,
    status: 'parked'
  };
  
  const vehicle = { ...defaults, ...overrides };
  
  const result = db.prepare(`
    INSERT INTO vehicles (unique_card_id, license_plate, make, model, color, hook_number, sequence_number, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    vehicle.unique_card_id, 
    vehicle.license_plate, 
    vehicle.make, 
    vehicle.model, 
    vehicle.color,
    vehicle.hook_number,
    vehicle.sequence_number,
    vehicle.status
  );
  
  // Mark hook as occupied
  db.prepare("UPDATE hooks SET status = 'occupied', reserved_for_card = ? WHERE hook_number = ?")
    .run(vehicle.unique_card_id, vehicle.hook_number);
  
  return { id: result.lastInsertRowid, ...vehicle };
}

/**
 * Create a test retrieval request
 */
function createTestRequest(db, cardId, overrides = {}) {
  const defaults = {
    unique_card_id: cardId,
    is_priority: 0,
    status: 'pending',
    amount: 15
  };
  
  const request = { ...defaults, ...overrides };
  
  const result = db.prepare(`
    INSERT INTO retrieval_requests (unique_card_id, is_priority, status, amount)
    VALUES (?, ?, ?, ?)
  `).run(request.unique_card_id, request.is_priority, request.status, request.amount);
  
  return { id: result.lastInsertRowid, ...request };
}

module.exports = {
  createTestDb,
  createTestApp,
  cleanupTestDb,
  createTestDriver,
  createTestVehicle,
  createTestRequest
};
