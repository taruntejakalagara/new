-- ============================================
-- THE DIGITAL KEY - DATABASE SCHEMA v2.0
-- ============================================
-- 
-- This is the consolidated schema for the pilot MVP.
-- Use the migration system (migrate.js) to apply changes.
-- 
-- Tables:
--   - settings          : Global configuration
--   - venues            : Multi-venue support
--   - venue_settings    : Per-venue configuration
--   - drivers           : Valet driver accounts
--   - vehicles          : Parked vehicles
--   - hooks             : Key hook tracking
--   - nfc_cards         : NFC card inventory
--   - nfc_card_history  : Card usage history
--   - retrieval_requests: Vehicle retrieval queue
--   - daily_closeouts   : End-of-day reports
--   - damage_photos     : Vehicle damage documentation
--   - audit_log         : System audit trail
--   - schema_migrations : Migration version tracking
-- ============================================

-- Global Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Venues (Hotels/Locations)
CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,                    -- Short code like 'FMT-PGH'
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    email TEXT,
    contact_name TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    max_hooks INTEGER DEFAULT 50,
    status TEXT DEFAULT 'active',        -- active, inactive, suspended
    settings TEXT,                       -- JSON for venue-specific config
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
);

-- Per-Venue Settings
CREATE TABLE IF NOT EXISTS venue_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(venue_id, key),
    FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- Drivers (Valet Staff)
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    username TEXT UNIQUE,
    password TEXT,                       -- bcrypt hash
    fullName TEXT,
    phone TEXT,
    email TEXT,
    licenseNumber TEXT,
    vehicleInfo TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    status TEXT DEFAULT 'active',        -- active, online, offline, suspended
    createdAt TEXT DEFAULT (datetime('now')),
    lastLogin TEXT,
    FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- Vehicles (Parked Cars)
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    unique_card_id TEXT NOT NULL,        -- NFC card UID
    sequence_number INTEGER NOT NULL,    -- Daily sequence (Car #N = Hook #N)
    hook_number INTEGER NOT NULL,        -- Physical key hook location
    license_plate TEXT NOT NULL,
    make TEXT DEFAULT 'Unknown',
    model TEXT DEFAULT 'Unknown',
    color TEXT,
    year TEXT,
    customer_phone TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'parked',        -- parked, requested, retrieving, ready, retrieved
    checked_in_by INTEGER,
    checked_out_by INTEGER,
    check_in_time TEXT DEFAULT (datetime('now')),
    check_out_time TEXT,
    notes TEXT,
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (checked_in_by) REFERENCES drivers(id),
    FOREIGN KEY (checked_out_by) REFERENCES drivers(id)
);

-- Key Hooks
CREATE TABLE IF NOT EXISTS hooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    hook_number INTEGER NOT NULL,
    status TEXT DEFAULT 'available',     -- available, occupied, reserved, maintenance
    reserved_for_card TEXT,
    reserved_at TEXT,
    vehicle_id INTEGER,
    UNIQUE(venue_id, hook_number),
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- NFC Card Inventory
CREATE TABLE IF NOT EXISTS nfc_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    card_uid TEXT UNIQUE NOT NULL,       -- Physical card UID
    card_number INTEGER,                 -- Human-readable number (printed on card)
    status TEXT DEFAULT 'available',     -- available, in_use, damaged, lost, retired
    current_vehicle_id INTEGER,
    last_used_at TEXT,
    total_uses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id)
);

-- NFC Card History
CREATE TABLE IF NOT EXISTS nfc_card_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    action TEXT NOT NULL,                -- assigned, released, damaged, lost, retired
    performed_by INTEGER,
    performed_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (card_id) REFERENCES nfc_cards(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (performed_by) REFERENCES drivers(id)
);

-- Retrieval Requests (Queue)
CREATE TABLE IF NOT EXISTS retrieval_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    unique_card_id TEXT NOT NULL,
    vehicle_id INTEGER,
    is_priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',       -- pending, assigned, retrieving, ready, completed, cancelled
    assigned_driver_id INTEGER,
    payment_method TEXT,                 -- cash, card, online, pending
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
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
);

-- Daily Closeouts
CREATE TABLE IF NOT EXISTS daily_closeouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    total_checkins INTEGER DEFAULT 0,
    total_retrievals INTEGER DEFAULT 0,
    cash_revenue REAL DEFAULT 0,
    card_revenue REAL DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    total_tips REAL DEFAULT 0,
    avg_wait_time REAL,
    closed_by TEXT,
    closed_at TEXT,
    notes TEXT,
    UNIQUE(venue_id, date),
    FOREIGN KEY (venue_id) REFERENCES venues(id)
);

-- Damage Photos
CREATE TABLE IF NOT EXISTS damage_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    photo_type TEXT NOT NULL,            -- checkin, checkout, incident
    photo_path TEXT NOT NULL,
    photo_data BLOB,                     -- Optional: store image data directly
    captured_by INTEGER,
    captured_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (captured_by) REFERENCES drivers(id)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,           -- driver, vehicle, request, setting
    entity_id INTEGER,
    action TEXT NOT NULL,                -- create, update, delete, login, logout
    actor_type TEXT,                     -- driver, system, admin
    actor_id INTEGER,
    old_value TEXT,                      -- JSON of previous state
    new_value TEXT,                      -- JSON of new state
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Migration Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================

-- Drivers
CREATE INDEX IF NOT EXISTS idx_drivers_username ON drivers(username);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_venue ON drivers(venue_id);

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_card_id ON vehicles(unique_card_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_hook ON vehicles(hook_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_checkin ON vehicles(check_in_time);
CREATE INDEX IF NOT EXISTS idx_vehicles_venue ON vehicles(venue_id);

-- Hooks
CREATE INDEX IF NOT EXISTS idx_hooks_status ON hooks(status);
CREATE INDEX IF NOT EXISTS idx_hooks_number ON hooks(hook_number);
CREATE INDEX IF NOT EXISTS idx_hooks_venue ON hooks(venue_id);

-- NFC Cards
CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid ON nfc_cards(card_uid);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_status ON nfc_cards(status);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_number ON nfc_cards(card_number);

-- Retrieval Requests
CREATE INDEX IF NOT EXISTS idx_requests_card ON retrieval_requests(unique_card_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON retrieval_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_driver ON retrieval_requests(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_requests_date ON retrieval_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_requests_venue ON retrieval_requests(venue_id);

-- Daily Closeouts
CREATE INDEX IF NOT EXISTS idx_closeouts_date ON daily_closeouts(date);
CREATE INDEX IF NOT EXISTS idx_closeouts_venue ON daily_closeouts(venue_id);

-- Damage Photos
CREATE INDEX IF NOT EXISTS idx_photos_vehicle ON damage_photos(vehicle_id);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

-- Venue Settings
CREATE INDEX IF NOT EXISTS idx_venue_settings ON venue_settings(venue_id, key);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default venue
INSERT OR IGNORE INTO venues (id, name, code, status) 
VALUES (1, 'Main Location', 'MAIN', 'active');

-- Default settings
INSERT OR IGNORE INTO settings (key, value, description) VALUES 
    ('base_fee', '15', 'Base valet fee in dollars'),
    ('priority_fee', '10', 'Additional fee for priority service'),
    ('hourly_rate', '5', 'Hourly parking rate after first hour'),
    ('surge_multiplier', '1.0', 'Surge pricing multiplier'),
    ('surge_enabled', 'false', 'Whether surge pricing is active'),
    ('max_hooks', '50', 'Maximum number of key hooks'),
    ('current_sequence', '0', 'Current vehicle sequence number');
