const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

console.log('🗄️  Initializing database schema...');

// Create tables
db.exec(`
  -- Vehicles table
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT UNIQUE NOT NULL,
    license_plate TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT,
    year TEXT,
    parking_spot TEXT,
    key_slot TEXT,
    status TEXT DEFAULT 'parked',
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME
  );

  -- Drivers table
  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    driver_id TEXT UNIQUE NOT NULL,
    phone TEXT,
    pin TEXT NOT NULL,
    is_available INTEGER DEFAULT 1
  );

  -- Retrieval requests table
  CREATE TABLE IF NOT EXISTS retrieval_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT NOT NULL,
    is_priority INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'pay_at_counter',
    amount REAL,
    payment_processed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    assigned_driver_id INTEGER,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (unique_card_id) REFERENCES vehicles(unique_card_id),
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_vehicles_card ON vehicles(unique_card_id);
  CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON retrieval_requests(status);
  CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available);
`);

console.log('✅ Tables created successfully');

// Insert sample drivers
const insertDriver = db.prepare(`
  INSERT OR IGNORE INTO drivers (name, driver_id, phone, pin, is_available)
  VALUES (?, ?, ?, ?, ?)
`);

const drivers = [
  ['John Smith', '1', '555-0101', '1234', 1],
  ['Mike Johnson', '2', '555-0102', '1234', 1],
  ['Sarah Williams', '3', '555-0103', '1234', 1],
];

drivers.forEach(driver => {
  insertDriver.run(...driver);
});

console.log('✅ Sample drivers added');

// Show counts
const vehicleCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get();
const driverCount = db.prepare('SELECT COUNT(*) as count FROM drivers').get();
const requestCount = db.prepare('SELECT COUNT(*) as count FROM retrieval_requests').get();

console.log('\n📊 Database Status:');
console.log(`   Vehicles: ${vehicleCount.count}`);
console.log(`   Drivers: ${driverCount.count}`);
console.log(`   Requests: ${requestCount.count}`);
console.log('\n✅ Database initialized successfully!\n');

db.close();
