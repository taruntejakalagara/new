// backend/database/update-drivers-table.js
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'valet.db'));

// Update drivers table with new fields
const updateDriversTable = `
  CREATE TABLE IF NOT EXISTS drivers_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    licenseNumber TEXT,
    vehicleInfo TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT NOT NULL,
    lastLogin TEXT,
    currentLocation TEXT,
    assignedTickets INTEGER DEFAULT 0
  );
`;

try {
  // Check if old table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drivers'").get();
  
  if (tableExists) {
    // Create new table
    db.exec(updateDriversTable);
    
    // Copy data from old table if it has data
    const oldDrivers = db.prepare('SELECT * FROM drivers').all();
    
    if (oldDrivers.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO drivers_new (id, fullName, username, password, phone, email, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const driver of oldDrivers) {
        insertStmt.run(
          driver.id,
          driver.fullName || driver.name || 'Unknown',
          driver.username || `driver${driver.id}`,
          driver.password || 'changeMe123',
          driver.phone || `555000${driver.id}`,
          driver.email || null,
          driver.status || 'active',
          driver.createdAt || new Date().toISOString()
        );
      }
    }
    
    // Drop old table and rename new one
    db.exec('DROP TABLE drivers');
    db.exec('ALTER TABLE drivers_new RENAME TO drivers');
    
    console.log('✅ Drivers table updated successfully');
  } else {
    // Create fresh table
    db.exec(updateDriversTable.replace('drivers_new', 'drivers'));
    console.log('✅ Drivers table created successfully');
  }
  
} catch (error) {
  console.error('❌ Error updating drivers table:', error);
} finally {
  db.close();
}
