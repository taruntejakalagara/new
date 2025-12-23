const Database = require('better-sqlite3');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const db = new Database('./valet.db');

console.log('Initializing database...');

// Drivers table
db.exec(`
  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'active',
    licenseNumber TEXT,
    vehicleInfo TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    createdAt TEXT,
    lastLogin TEXT
  )
`);

// Vehicles table
db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT UNIQUE NOT NULL,
    sequence_number INTEGER NOT NULL,
    license_plate TEXT NOT NULL,
    make TEXT,
    model TEXT,
    color TEXT,
    customer_phone TEXT,
    hook_number INTEGER NOT NULL,
    status TEXT DEFAULT 'parked',
    check_in_time TEXT DEFAULT (datetime('now')),
    check_out_time TEXT,
    checked_in_by INTEGER,
    FOREIGN KEY (checked_in_by) REFERENCES drivers(id)
  )
`);

// Retrieval requests table
db.exec(`
  CREATE TABLE IF NOT EXISTS retrieval_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT NOT NULL,
    assigned_driver_id INTEGER,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_processed INTEGER DEFAULT 0,
    amount REAL DEFAULT 15.0,
    tip_amount REAL DEFAULT 0.0,
    requested_at TEXT DEFAULT (datetime('now')),
    assigned_at TEXT,
    car_ready_at TEXT,
    keys_handed_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
  )
`);

// Insert default drivers
const hashedPassword = hashPassword('password123');
const now = new Date().toISOString();

const drivers = [
  ['Tarun', 'tarun', hashedPassword, '8765432123', 'tarun@valet.com'],
  ['Teja', 'teja', hashedPassword, '7654321234', 'teja@valet.com'],
  ['Raeu', 'raeu', hashedPassword, '9876543210', 'raeu@valet.com']
];

const insertDriver = db.prepare(`
  INSERT OR IGNORE INTO drivers (fullName, username, password, phone, email, status, createdAt)
  VALUES (?, ?, ?, ?, ?, 'active', ?)
`);

drivers.forEach(driver => {
  insertDriver.run(...driver, now);
});

console.log('✅ Database initialized successfully!');
console.log('✅ Default drivers created (username/password):');
console.log('   - tarun/password123');
console.log('   - teja/password123');
console.log('   - raeu/password123');

db.close();
