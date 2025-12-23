const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

console.log('Fixing column names to match snake_case...');

try {
  // Rename createdAt to created_at if it exists
  const columns = db.prepare("PRAGMA table_info(drivers)").all();
  const hasCreatedAt = columns.some(col => col.name === 'createdAt');
  const hasLastLogin = columns.some(col => col.name === 'lastLogin');
  
  if (hasCreatedAt) {
    console.log('Renaming createdAt to created_at...');
    // SQLite doesn't support column rename directly, need to recreate table
    db.exec(`
      CREATE TABLE drivers_temp AS SELECT * FROM drivers;
      DROP TABLE drivers;
      CREATE TABLE drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT DEFAULT 'inactive',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fullName TEXT,
        username TEXT,
        password TEXT,
        email TEXT,
        licenseNumber TEXT,
        vehicleInfo TEXT,
        emergencyContact TEXT,
        emergencyPhone TEXT,
        last_login TEXT
      );
      INSERT INTO drivers SELECT * FROM drivers_temp;
      DROP TABLE drivers_temp;
    `);
    console.log('✅ Column names fixed');
  } else {
    console.log('✓ Column names already correct');
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
