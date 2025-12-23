const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'valet.db');
const db = new Database(dbPath);

console.log('Adding missing columns to requests table...');

try {
  const missingColumns = [
    'car_ready_at DATETIME',
    'keys_handed_at DATETIME',
    'payment_processed INTEGER DEFAULT 0',
    'unique_card_id TEXT',
    'vehicle_make TEXT',
    'vehicle_model TEXT',
    'vehicle_color TEXT',
    'license_plate TEXT',
    'key_slot TEXT',
    'pickup_location TEXT',
    'customer_location TEXT'
  ];

  for (const col of missingColumns) {
    try {
      const colName = col.split(' ')[0];
      db.exec(`ALTER TABLE requests ADD COLUMN ${col}`);
      console.log(`✓ Added column: ${colName}`);
    } catch (err) {
      if (err.message.includes('duplicate column')) {
        console.log(`- Column already exists: ${col.split(' ')[0]}`);
      } else {
        console.error(`Error adding ${col}:`, err.message);
      }
    }
  }

  console.log('\n✅ Requests table updated');
  
  // Show final structure
  const cols = db.prepare("PRAGMA table_info(requests)").all();
  console.log('\nFinal columns:', cols.map(c => c.name).join(', '));
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
