class HookManager {
  constructor(db) {
    this.db = db;
    this.initializeHooks();
  }

  initializeHooks() {
    // Create hooks table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hook_number INTEGER UNIQUE NOT NULL,
        status TEXT DEFAULT 'available',
        vehicle_id INTEGER,
        reserved_for_card TEXT,
        reserved_at TEXT,
        assigned_at TEXT,
        venue_id INTEGER DEFAULT 1,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      )
    `);

    // Ensure 50 hooks exist
    const count = this.db.prepare('SELECT COUNT(*) as count FROM hooks').get();
    if (count.count === 0) {
      const stmt = this.db.prepare('INSERT INTO hooks (hook_number, status) VALUES (?, ?)');
      for (let i = 1; i <= 50; i++) {
        stmt.run(i, 'available');
      }
      console.log('✓ Initialized 50 hooks');
    }
  }

  getNextAvailableHook() {
    const hook = this.db.prepare(`
      SELECT hook_number FROM hooks 
      WHERE status = 'available' 
      AND reserved_for_card IS NULL
      ORDER BY hook_number ASC 
      LIMIT 1
    `).get();
    return hook ? hook.hook_number : null;
  }

  assignHook(hookNumber, cardId) {
    this.db.prepare(`
      UPDATE hooks 
      SET status = 'occupied', reserved_for_card = ?, reserved_at = datetime('now') 
      WHERE hook_number = ?
    `).run(cardId, hookNumber);
    return { success: true, hookNumber };
  }

  releaseHook(hookNumber) {
    this.db.prepare(`
      UPDATE hooks 
      SET status = 'available', reserved_for_card = NULL, reserved_at = NULL 
      WHERE hook_number = ?
    `).run(hookNumber);
    return { success: true };
  }

  getHookStatus() {
    return this.db.prepare('SELECT * FROM hooks ORDER BY hook_number ASC').all();
  }

  getAvailableHooksCount() {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM hooks WHERE status = "available"').get();
    return result.count;
  }

  getStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM hooks').get().count || 50;
    const available = this.db.prepare("SELECT COUNT(*) as count FROM hooks WHERE status = 'available'").get().count || 0;
    const occupied = this.db.prepare("SELECT COUNT(*) as count FROM hooks WHERE status = 'occupied'").get().count || 0;
    const reserved = this.db.prepare("SELECT COUNT(*) as count FROM hooks WHERE reserved_for_card IS NOT NULL AND status = 'available'").get().count || 0;
    
    return {
      total,
      available,
      occupied,
      reserved
    };
  }
}

module.exports = HookManager;
