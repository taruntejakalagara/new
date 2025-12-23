const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('🔧 Complete Database Fix Starting...\n');

try {
  // Get current tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Current tables:', tables.map(t => t.name).join(', '));

  // Get current drivers columns
  const columns = db.prepare("PRAGMA table_info(drivers)").all();
  console.log('\nCurrent drivers columns:', columns.map(c => c.name).join(', '));

  // Check if we need to fix the schema
  const hasUsername = columns.some(c => c.name === 'username');
  const hasCreated_at = columns.some(c => c.name === 'created_at');

  if (!hasUsername || !hasCreated_at) {
    console.log('\n❌ Schema needs fixing. Recreating drivers table...');
    
    // Backup existing data
    const existingDrivers = db.prepare('SELECT * FROM drivers').all();
    console.log(`Found ${existingDrivers.length} existing drivers`);

    // Drop and recreate table with correct schema
    db.exec(`DROP TABLE IF EXISTS drivers`);
    
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

    console.log('✅ Created new drivers table');

    // Restore data
    for (const driver of existingDrivers) {
      const username = driver.username || (driver.name || driver.fullName || `driver${driver.id}`).toLowerCase().replace(/\s+/g, '');
      const password = driver.password || hashPassword('password123');
      const fullName = driver.fullName || driver.name || 'Unknown';

      db.prepare(`
        INSERT INTO drivers (id, name, fullName, username, password, phone, email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        driver.id,
        driver.name,
        fullName,
        username,
        password,
        driver.phone,
        driver.email || null,
        driver.status || 'active',
        driver.created_at || driver.createdAt || new Date().toISOString()
      );

      console.log(`✓ Restored driver: ${fullName} (username: ${username})`);
    }
  } else {
    console.log('\n✅ Schema is correct');
  }

  // Show final state
  console.log('\n📊 Final drivers:');
  const finalDrivers = db.prepare('SELECT id, name, fullName, username, phone, status FROM drivers').all();
  finalDrivers.forEach(d => {
    console.log(`  - ${d.fullName || d.name} (username: ${d.username})`);
  });

  console.log('\n✅ Database fix complete!');
  console.log('\n🔐 Login credentials:');
  finalDrivers.forEach(d => {
    console.log(`  Username: "${d.username}" | Password: "password123"`);
  });

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
} finally {
  db.close();
}
