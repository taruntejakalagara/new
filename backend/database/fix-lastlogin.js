const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

console.log('Fixing lastLogin column...');

try {
  // Get all drivers data
  const drivers = db.prepare('SELECT * FROM drivers').all();
  
  // Drop and recreate with correct column name
  db.exec('DROP TABLE drivers');
  
  db.exec(`
    CREATE TABLE drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fullName TEXT,
      username TEXT UNIQUE,
      password TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      status TEXT DEFAULT 'active',
      licenseNumber TEXT,
      vehicleInfo TEXT,
      emergencyContact TEXT,
      emergencyPhone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);
  
  // Restore data
  const insert = db.prepare(`
    INSERT INTO drivers (id, name, fullName, username, password, phone, email, status, licenseNumber, vehicleInfo, emergencyContact, emergencyPhone, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const d of drivers) {
    insert.run(
      d.id, d.name, d.fullName, d.username, d.password, d.phone,
      d.email, d.status, d.licenseNumber, d.vehicleInfo,
      d.emergencyContact, d.emergencyPhone, d.created_at,
      d.lastLogin || d.last_login || null
    );
  }
  
  console.log('✅ Fixed lastLogin -> last_login');
  
  // Verify
  const cols = db.prepare("PRAGMA table_info(drivers)").all();
  console.log('Columns now:', cols.map(c => c.name).join(', '));
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
