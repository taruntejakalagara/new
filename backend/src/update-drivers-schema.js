const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'valet.db'));

console.log('Updating drivers table schema...\n');

try {
  // Drop old table
  db.exec('DROP TABLE IF EXISTS drivers');
  console.log('✓ Dropped old drivers table');

  // Create new table with correct schema
  db.exec(`
    CREATE TABLE drivers (
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
      lastLogin TEXT
    )
  `);
  console.log('✓ Created new drivers table with correct schema');
  
  console.log('\n✅ Database schema updated successfully!');
  
} catch (error) {
  console.error('❌ Error updating schema:', error);
} finally {
  db.close();
}
