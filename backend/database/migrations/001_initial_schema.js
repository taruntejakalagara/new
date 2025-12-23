/**
 * Migration: 001_initial_schema
 * 
 * Consolidates all existing tables and ensures proper structure
 * This is safe to run on existing databases - uses IF NOT EXISTS
 */

module.exports = {
  up: (db) => {
    // ==========================================
    // SETTINGS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Insert default settings if not exist
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)
    `);
    
    insertSetting.run('base_fee', '15', 'Base valet fee in dollars');
    insertSetting.run('priority_fee', '10', 'Additional fee for priority service');
    insertSetting.run('hourly_rate', '5', 'Hourly parking rate after first hour');
    insertSetting.run('surge_multiplier', '1.0', 'Surge pricing multiplier');
    insertSetting.run('surge_enabled', 'false', 'Whether surge pricing is active');
    insertSetting.run('max_hooks', '50', 'Maximum number of key hooks');
    insertSetting.run('current_sequence', '0', 'Current vehicle sequence number');

    // ==========================================
    // DRIVERS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        fullName TEXT,
        phone TEXT,
        email TEXT,
        licenseNumber TEXT,
        vehicleInfo TEXT,
        emergencyContact TEXT,
        emergencyPhone TEXT,
        status TEXT DEFAULT 'active',
        createdAt TEXT DEFAULT (datetime('now')),
        lastLogin TEXT
      )
    `);

    // Add columns if they don't exist (for existing databases)
    const driverColumns = ['username', 'password', 'fullName', 'email', 'licenseNumber', 
                           'vehicleInfo', 'emergencyContact', 'emergencyPhone', 'lastLogin'];
    
    const existingColumns = db.prepare(`PRAGMA table_info(drivers)`).all()
      .map(col => col.name);
    
    driverColumns.forEach(col => {
      if (!existingColumns.includes(col)) {
        try {
          db.exec(`ALTER TABLE drivers ADD COLUMN ${col} TEXT`);
          console.log(`    Added column drivers.${col}`);
        } catch (e) {
          // Column might already exist
        }
      }
    });

    // Create index on username
    db.exec(`CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers(username)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)`);

    // ==========================================
    // VEHICLES TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unique_card_id TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        hook_number INTEGER NOT NULL,
        license_plate TEXT NOT NULL,
        make TEXT DEFAULT 'Unknown',
        model TEXT DEFAULT 'Unknown',
        color TEXT,
        year TEXT,
        customer_phone TEXT,
        customer_name TEXT,
        status TEXT DEFAULT 'parked',
        checked_in_by INTEGER,
        checked_out_by INTEGER,
        check_in_time TEXT DEFAULT (datetime('now')),
        check_out_time TEXT,
        notes TEXT,
        FOREIGN KEY (checked_in_by) REFERENCES drivers(id),
        FOREIGN KEY (checked_out_by) REFERENCES drivers(id)
      )
    `);

    // Add new columns if they don't exist
    const vehicleColumns = ['year', 'customer_name', 'checked_in_by', 'checked_out_by', 'notes'];
    const existingVehicleCols = db.prepare(`PRAGMA table_info(vehicles)`).all()
      .map(col => col.name);
    
    vehicleColumns.forEach(col => {
      if (!existingVehicleCols.includes(col)) {
        try {
          db.exec(`ALTER TABLE vehicles ADD COLUMN ${col} TEXT`);
          console.log(`    Added column vehicles.${col}`);
        } catch (e) {
          // Column might already exist
        }
      }
    });

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_card_id ON vehicles(unique_card_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_hook ON vehicles(hook_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_checkin ON vehicles(check_in_time)`);

    // ==========================================
    // HOOKS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS hooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hook_number INTEGER NOT NULL UNIQUE,
        status TEXT DEFAULT 'available',
        reserved_for_card TEXT,
        reserved_at TEXT,
        vehicle_id INTEGER,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);

    // Initialize hooks if empty
    const hookCount = db.prepare('SELECT COUNT(*) as count FROM hooks').get();
    if (hookCount.count === 0) {
      const maxHooks = db.prepare("SELECT value FROM settings WHERE key = 'max_hooks'").get();
      const numHooks = maxHooks ? parseInt(maxHooks.value) : 50;
      
      const insertHook = db.prepare('INSERT INTO hooks (hook_number, status) VALUES (?, ?)');
      for (let i = 1; i <= numHooks; i++) {
        insertHook.run(i, 'available');
      }
      console.log(`    Initialized ${numHooks} hooks`);
    }

    db.exec(`CREATE INDEX IF NOT EXISTS idx_hooks_status ON hooks(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hooks_number ON hooks(hook_number)`);

    // ==========================================
    // RETRIEVAL REQUESTS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS retrieval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unique_card_id TEXT NOT NULL,
        vehicle_id INTEGER,
        is_priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        assigned_driver_id INTEGER,
        payment_method TEXT,
        amount REAL,
        tip_amount REAL DEFAULT 0,
        payment_processed INTEGER DEFAULT 0,
        requested_at TEXT DEFAULT (datetime('now')),
        assigned_at TEXT,
        car_ready_at TEXT,
        keys_handed_at TEXT,
        completed_at TEXT,
        cancelled_at TEXT,
        cancel_reason TEXT,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
      )
    `);

    // Add new columns if needed
    const requestColumns = ['vehicle_id', 'cancelled_at', 'cancel_reason', 'keys_handed_at'];
    const existingRequestCols = db.prepare(`PRAGMA table_info(retrieval_requests)`).all()
      .map(col => col.name);
    
    requestColumns.forEach(col => {
      if (!existingRequestCols.includes(col)) {
        try {
          db.exec(`ALTER TABLE retrieval_requests ADD COLUMN ${col} TEXT`);
          console.log(`    Added column retrieval_requests.${col}`);
        } catch (e) {
          // Column might already exist
        }
      }
    });

    db.exec(`CREATE INDEX IF NOT EXISTS idx_requests_card ON retrieval_requests(unique_card_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_requests_status ON retrieval_requests(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_requests_driver ON retrieval_requests(assigned_driver_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_requests_date ON retrieval_requests(requested_at)`);

    // ==========================================
    // DAILY CLOSEOUTS TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_closeouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_checkins INTEGER DEFAULT 0,
        total_retrievals INTEGER DEFAULT 0,
        cash_revenue REAL DEFAULT 0,
        card_revenue REAL DEFAULT 0,
        total_revenue REAL DEFAULT 0,
        total_tips REAL DEFAULT 0,
        avg_wait_time REAL,
        closed_by TEXT,
        closed_at TEXT,
        notes TEXT
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_closeouts_date ON daily_closeouts(date)`);

    // ==========================================
    // DAMAGE PHOTOS TABLE (for future use)
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS damage_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        photo_type TEXT NOT NULL,
        photo_path TEXT NOT NULL,
        photo_data BLOB,
        captured_by INTEGER,
        captured_at TEXT DEFAULT (datetime('now')),
        notes TEXT,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (captured_by) REFERENCES drivers(id)
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_vehicle ON damage_photos(vehicle_id)`);

    // ==========================================
    // AUDIT LOG TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        action TEXT NOT NULL,
        actor_type TEXT,
        actor_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at)`);

    console.log('    Schema consolidated successfully');
  },

  down: (db) => {
    // Rollback - be careful with this in production!
    console.log('    Warning: Rollback will drop audit_log and damage_photos tables');
    db.exec('DROP TABLE IF EXISTS audit_log');
    db.exec('DROP TABLE IF EXISTS damage_photos');
    // Don't drop core tables on rollback - too dangerous
  }
};
