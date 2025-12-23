-- Paperless Valet Platform - SQLite Schema
-- Simple, fast, and optimized

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_card_id TEXT UNIQUE NOT NULL,
    sequence_number INTEGER NOT NULL,
    license_plate TEXT NOT NULL,
    make TEXT,
    model TEXT,
    color TEXT,
    customer_phone TEXT,
    hook_number INTEGER NOT NULL,
    status TEXT DEFAULT 'parked',
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME
);

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER,
    request_type TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME,
    arrived_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    duration_minutes INTEGER,
    transaction_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

-- Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    base_rate REAL DEFAULT 15.0,
    hourly_rate REAL DEFAULT 5.0,
    daily_maximum REAL DEFAULT 40.0,
    active INTEGER DEFAULT 1
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_card_id ON vehicles(unique_card_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);

-- Initial Data
INSERT OR IGNORE INTO drivers (id, name, phone, status) VALUES 
    (1, 'John Doe', '+1234567890', 'active'),
    (2, 'Jane Smith', '+1234567891', 'active');

INSERT OR IGNORE INTO pricing_rules (id, name, base_rate, hourly_rate, daily_maximum) 
VALUES (1, 'Standard', 15.0, 5.0, 40.0);

INSERT OR IGNORE INTO system_settings (key, value) VALUES 
    ('current_sequence', '0'),
    ('max_capacity', '100');
