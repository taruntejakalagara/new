const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('Starting driver table migration...');

try {
  // Add missing columns
  const alterQueries = [
    `ALTER TABLE drivers ADD COLUMN fullName TEXT`,
    `ALTER TABLE drivers ADD COLUMN username TEXT`,
    `ALTER TABLE drivers ADD COLUMN password TEXT`,
    `ALTER TABLE drivers ADD COLUMN email TEXT`,
    `ALTER TABLE drivers ADD COLUMN licenseNumber TEXT`,
    `ALTER TABLE drivers ADD COLUMN vehicleInfo TEXT`,
    `ALTER TABLE drivers ADD COLUMN emergencyContact TEXT`,
    `ALTER TABLE drivers ADD COLUMN emergencyPhone TEXT`,
    `ALTER TABLE drivers ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE drivers ADD COLUMN lastLogin TEXT`
  ];

  for (const query of alterQueries) {
    try {
      db.exec(query);
      console.log('✓', query);
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log('- Column already exists:', query.split('ADD COLUMN')[1].split(' ')[1]);
      } else {
        console.error('Error:', err.message);
      }
    }
  }

  // Update existing drivers with fullName from name
  db.exec(`UPDATE drivers SET fullName = name WHERE fullName IS NULL`);
  console.log('✓ Updated fullName from name');

  // Create default login credentials for existing drivers
  const drivers = db.prepare('SELECT * FROM drivers').all();
  
  for (const driver of drivers) {
    if (!driver.username) {
      const username = driver.name.toLowerCase().replace(/\s+/g, '');
      const password = 'password123'; // Default password
      const hashedPassword = hashPassword(password);
      
      db.prepare('UPDATE drivers SET username = ?, password = ? WHERE id = ?')
        .run(username, hashedPassword, driver.id);
      
      console.log(`✓ Created credentials for ${driver.name}: username=${username}, password=${password}`);
    }
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\nDefault credentials created:');
  const updatedDrivers = db.prepare('SELECT id, name, username FROM drivers').all();
  updatedDrivers.forEach(d => {
    console.log(`- ${d.name}: username="${d.username}", password="password123"`);
  });

} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
