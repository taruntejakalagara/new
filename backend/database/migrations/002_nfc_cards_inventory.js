/**
 * Migration: 002_nfc_cards_inventory
 * 
 * Adds NFC card inventory tracking
 * Supports card lifecycle: available -> in_use -> available
 */

module.exports = {
  up: (db) => {
    // ==========================================
    // NFC CARDS INVENTORY TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS nfc_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_uid TEXT UNIQUE NOT NULL,
        card_number INTEGER,
        status TEXT DEFAULT 'available',
        current_vehicle_id INTEGER,
        last_used_at TEXT,
        total_uses INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        notes TEXT,
        FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id)
      )
    `);

    // Card statuses: available, in_use, damaged, lost, retired
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid ON nfc_cards(card_uid)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_nfc_cards_status ON nfc_cards(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_nfc_cards_number ON nfc_cards(card_number)`);

    // ==========================================
    // NFC CARD HISTORY TABLE
    // ==========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS nfc_card_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        vehicle_id INTEGER,
        action TEXT NOT NULL,
        performed_by INTEGER,
        performed_at TEXT DEFAULT (datetime('now')),
        notes TEXT,
        FOREIGN KEY (card_id) REFERENCES nfc_cards(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (performed_by) REFERENCES drivers(id)
      )
    `);

    // Actions: assigned, released, marked_damaged, marked_lost, retired, reactivated

    db.exec(`CREATE INDEX IF NOT EXISTS idx_card_history_card ON nfc_card_history(card_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_card_history_date ON nfc_card_history(performed_at)`);

    console.log('    NFC cards inventory tables created');
  },

  down: (db) => {
    db.exec('DROP TABLE IF EXISTS nfc_card_history');
    db.exec('DROP TABLE IF EXISTS nfc_cards');
    console.log('    NFC cards tables dropped');
  }
};
