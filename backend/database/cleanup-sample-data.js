/**
 * Database Cleanup Script
 * Removes all sample/test data from the database
 * Run this before going to production
 * 
 * Usage: node database/cleanup-sample-data.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'valet.db');
const db = new Database(dbPath);

console.log('🧹 Starting database cleanup...\n');

// Tables to clear
const tables = [
  'vehicles',
  'retrieval_requests',
  'cash_payments',
  'daily_closeouts',
  'shift_closeouts',
  'driver_shifts',
  'lost_card_verifications',
];

// Keep certain tables like drivers, managers, settings
const keepTables = [
  'drivers',
  'managers', 
  'settings',
  'hook_assignments',
];

try {
  // Get all tables
  const allTables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log('Found tables:', allTables.map(t => t.name).join(', '));
  console.log('');

  // Clear data from specified tables
  for (const table of tables) {
    try {
      const countBefore = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      
      if (countBefore.count > 0) {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`✅ Cleared ${countBefore.count} rows from ${table}`);
      } else {
        console.log(`⏭️  ${table} is already empty`);
      }
    } catch (err) {
      console.log(`⚠️  Table ${table} does not exist, skipping`);
    }
  }

  console.log('\n🎉 Database cleanup complete!');
  console.log('\nKept data in:', keepTables.join(', '));
  console.log('\nNote: You may want to create fresh manager/driver accounts for production.');

} catch (error) {
  console.error('Error during cleanup:', error);
  process.exit(1);
} finally {
  db.close();
}
