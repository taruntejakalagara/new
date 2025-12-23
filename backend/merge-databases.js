const Database = require('better-sqlite3');

console.log('🔄 Merging databases...\n');

const oldDb = new Database('./src/valet.db');
const newDb = new Database('./valet.db');

try {
  // Get all data from old database
  const drivers = oldDb.prepare('SELECT * FROM drivers').all();
  const vehicles = oldDb.prepare('SELECT * FROM vehicles').all();
  const retrievalRequests = oldDb.prepare('SELECT * FROM retrieval_requests').all();
  
  let pricingSettings = [];
  let hooks = [];
  
  try {
    pricingSettings = oldDb.prepare('SELECT * FROM pricing_settings').all();
  } catch (e) {
    console.log('⚠️  No pricing_settings table in old db');
  }
  
  try {
    hooks = oldDb.prepare('SELECT * FROM hooks').all();
  } catch (e) {
    console.log('⚠️  No hooks table in old db');
  }

  console.log(`Found in old database:`);
  console.log(`  - ${drivers.length} drivers`);
  console.log(`  - ${vehicles.length} vehicles`);
  console.log(`  - ${retrievalRequests.length} retrieval requests`);
  console.log(`  - ${pricingSettings.length} pricing settings`);
  console.log(`  - ${hooks.length} hooks\n`);

  // Create hooks table if it doesn't exist
  newDb.exec(`
    CREATE TABLE IF NOT EXISTS hooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hook_number INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Insert drivers
  if (drivers.length > 0) {
    const insertDriver = newDb.prepare(`
      INSERT OR REPLACE INTO drivers 
      (id, fullName, username, password, phone, email, status, licenseNumber, vehicleInfo, emergencyContact, emergencyPhone, createdAt, lastLogin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    drivers.forEach(d => {
      insertDriver.run(
        d.id, d.fullName, d.username, d.password, d.phone, d.email, 
        d.status, d.licenseNumber, d.vehicleInfo, d.emergencyContact, 
        d.emergencyPhone, d.createdAt, d.lastLogin
      );
    });
    console.log(`✅ Inserted ${drivers.length} drivers`);
  }

  // Insert vehicles - handle NULL sequence_number and hook_number
  if (vehicles.length > 0) {
    const insertVehicle = newDb.prepare(`
      INSERT OR REPLACE INTO vehicles 
      (id, unique_card_id, sequence_number, license_plate, make, model, color, customer_phone, hook_number, status, check_in_time, check_out_time, checked_in_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let sequenceCounter = 1;
    let hookCounter = 1;
    
    vehicles.forEach(v => {
      // Use vehicle id as sequence_number if it's NULL or 0
      const seqNum = v.sequence_number || v.id || sequenceCounter++;
      
      // Use a default hook number if NULL or 0
      const hookNum = v.hook_number || hookCounter++;
      
      insertVehicle.run(
        v.id, v.unique_card_id, seqNum, v.license_plate, v.make, 
        v.model, v.color, v.customer_phone, hookNum, v.status, 
        v.check_in_time, v.check_out_time, v.checked_in_by
      );
    });
    console.log(`✅ Inserted ${vehicles.length} vehicles`);
  }

  // Insert retrieval requests
  if (retrievalRequests.length > 0) {
    const insertRequest = newDb.prepare(`
      INSERT OR REPLACE INTO retrieval_requests 
      (id, unique_card_id, assigned_driver_id, status, priority, payment_method, payment_processed, amount, tip_amount, requested_at, assigned_at, car_ready_at, keys_handed_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    retrievalRequests.forEach(r => {
      insertRequest.run(
        r.id, r.unique_card_id, r.assigned_driver_id, r.status, r.priority, 
        r.payment_method, r.payment_processed, r.amount, r.tip_amount, 
        r.requested_at, r.assigned_at, r.car_ready_at, r.keys_handed_at, r.completed_at
      );
    });
    console.log(`✅ Inserted ${retrievalRequests.length} retrieval requests`);
  }

  // Insert pricing settings
  if (pricingSettings.length > 0) {
    const insertPricing = newDb.prepare(`
      INSERT OR REPLACE INTO pricing_settings 
      (id, base_rate, hourly_rate, daily_maximum, active)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    pricingSettings.forEach(p => {
      insertPricing.run(p.id, p.base_rate, p.hourly_rate, p.daily_maximum, p.active);
    });
    console.log(`✅ Inserted ${pricingSettings.length} pricing settings`);
  }

  // Insert hooks
  if (hooks.length > 0) {
    const insertHook = newDb.prepare(`
      INSERT OR REPLACE INTO hooks 
      (id, hook_number, status, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    hooks.forEach(h => {
      insertHook.run(h.id, h.hook_number, h.status, h.created_at);
    });
    console.log(`✅ Inserted ${hooks.length} hooks`);
  }

  console.log('\n✅ Database merge completed successfully!');
  console.log('\nVerifying merged data:');
  
  const finalDrivers = newDb.prepare('SELECT COUNT(*) as count FROM drivers').get();
  const finalVehicles = newDb.prepare('SELECT COUNT(*) as count FROM vehicles').get();
  const finalRequests = newDb.prepare('SELECT COUNT(*) as count FROM retrieval_requests').get();
  const finalHooks = newDb.prepare('SELECT COUNT(*) as count FROM hooks').get();
  
  console.log(`  - ${finalDrivers.count} drivers`);
  console.log(`  - ${finalVehicles.count} vehicles`);
  console.log(`  - ${finalRequests.count} retrieval requests`);
  console.log(`  - ${finalHooks.count} hooks`);
  
} catch (error) {
  console.error('❌ Error merging databases:', error);
} finally {
  oldDb.close();
  newDb.close();
}
