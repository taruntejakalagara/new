/**
 * Migration: 003_multi_venue_support
 * 
 * Adds venue/location support for multi-site deployments
 * Prepares for pilot at multiple hotels
 */

module.exports = {
  up: (db) => {
    // ==========================================
    // VENUES TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS venues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        phone TEXT,
        email TEXT,
        contact_name TEXT,
        timezone TEXT DEFAULT 'America/New_York',
        max_hooks INTEGER DEFAULT 50,
        status TEXT DEFAULT 'active',
        settings TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_venues_code ON venues(code)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status)`);

    // Insert default venue
    db.exec(`
      INSERT OR IGNORE INTO venues (id, name, code, status) 
      VALUES (1, 'Main Location', 'MAIN', 'active')
    `);

    // ==========================================
    // ADD VENUE_ID TO EXISTING TABLES
    // Note: SQLite doesn't support REFERENCES in ALTER TABLE
    // We add plain INTEGER columns instead
    // ==========================================
    
    // Check and add venue_id to drivers
    const driverCols = db.prepare(`PRAGMA table_info(drivers)`).all().map(c => c.name);
    if (!driverCols.includes('venue_id')) {
      db.exec(`ALTER TABLE drivers ADD COLUMN venue_id INTEGER DEFAULT 1`);
      console.log('    Added venue_id to drivers');
    }

    // Check and add venue_id to vehicles
    const vehicleCols = db.prepare(`PRAGMA table_info(vehicles)`).all().map(c => c.name);
    if (!vehicleCols.includes('venue_id')) {
      db.exec(`ALTER TABLE vehicles ADD COLUMN venue_id INTEGER DEFAULT 1`);
      console.log('    Added venue_id to vehicles');
    }

    // Check and add venue_id to hooks
    const hookCols = db.prepare(`PRAGMA table_info(hooks)`).all().map(c => c.name);
    if (!hookCols.includes('venue_id')) {
      db.exec(`ALTER TABLE hooks ADD COLUMN venue_id INTEGER DEFAULT 1`);
      console.log('    Added venue_id to hooks');
    }

    // Check and add venue_id to retrieval_requests
    const requestCols = db.prepare(`PRAGMA table_info(retrieval_requests)`).all().map(c => c.name);
    if (!requestCols.includes('venue_id')) {
      db.exec(`ALTER TABLE retrieval_requests ADD COLUMN venue_id INTEGER DEFAULT 1`);
      console.log('    Added venue_id to retrieval_requests');
    }

    // Check and add venue_id to daily_closeouts
    const closeoutCols = db.prepare(`PRAGMA table_info(daily_closeouts)`).all().map(c => c.name);
    if (!closeoutCols.includes('venue_id')) {
      db.exec(`ALTER TABLE daily_closeouts ADD COLUMN venue_id INTEGER DEFAULT 1`);
      console.log('    Added venue_id to daily_closeouts');
    }

    // Check and add venue_id to nfc_cards if it exists
    try {
      const cardCols = db.prepare(`PRAGMA table_info(nfc_cards)`).all().map(c => c.name);
      if (!cardCols.includes('venue_id')) {
        db.exec(`ALTER TABLE nfc_cards ADD COLUMN venue_id INTEGER DEFAULT 1`);
        console.log('    Added venue_id to nfc_cards');
      }
    } catch (e) {
      // nfc_cards table might not exist yet
    }

    // ==========================================
    // VENUE-SPECIFIC SETTINGS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS venue_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(venue_id, key)
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_venue_settings ON venue_settings(venue_id, key)`);

    // Copy global settings to venue 1
    db.exec(`
      INSERT OR IGNORE INTO venue_settings (venue_id, key, value)
      SELECT 1, key, value FROM settings
    `);

    console.log('    Multi-venue support added');
  },

  down: (db) => {
    // Note: Cannot remove columns in SQLite without recreating tables
    // Just drop the new tables
    db.exec('DROP TABLE IF EXISTS venue_settings');
    db.exec('DROP TABLE IF EXISTS venues');
    console.log('    Venue tables dropped (venue_id columns remain)');
  }
};
