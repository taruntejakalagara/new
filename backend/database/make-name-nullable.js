const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

console.log('Making name column nullable...');

try {
  const drivers = db.prepare('SELECT * FROM drivers').all();
  
  db.exec('DROP TABLE drivers');
  
  db.exec(`
    CREATE TABLE drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    )
  `);
  
  const insert = db.prepare(`
    INSERT INTO drivers (id, name, fullName, username, password, phone, email, status, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const d of drivers) {
    insert.run(
      d.id,
      d.fullName || d.name,  // name = fullName
      d.fullName || d.name,  // fullName
      d.username,
      d.password,
      d.phone,
      d.email,
      d.status,
      d.created_at,
      d.last_login
    );
  }
  
  console.log('✅ Schema updated - name is now nullable, fullName is required');
  
  const result = db.prepare('SELECT id, name, fullName, username FROM drivers').all();
  console.log('Drivers:', result);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
