const express = require('express');
const router = express.Router();
const path = require('path');

// Get database - try multiple methods
function getDb(req) {
  // Method 1: From request (middleware)
  if (req.db) return req.db;
  
  // Method 2: From app locals
  if (req.app && req.app.locals && req.app.locals.db) return req.app.locals.db;
  
  // Method 3: From app.get('db')
  if (req.app && req.app.get('db')) return req.app.get('db');
  
  // Method 4: Direct import (fallback)
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.db');
    return new Database(dbPath);
  } catch (err) {
    console.error('Failed to get database:', err);
    return null;
  }
}

// GET /api/drivers - Get all drivers
router.get('/', (req, res) => {
  try {
    const db = getDb(req);
    
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    // First check what columns exist in the drivers table
    let tableInfo;
    try {
      tableInfo = db.prepare("PRAGMA table_info(drivers)").all();
    } catch (e) {
      // Table might not exist
      return res.json({ success: true, drivers: [] });
    }
    
    const columns = tableInfo.map(col => col.name);
    
    if (columns.length === 0) {
      return res.json({ success: true, drivers: [] });
    }
    
    // Build SELECT based on available columns
    const selectColumns = [];
    
    if (columns.includes('id')) selectColumns.push('id');
    if (columns.includes('username')) selectColumns.push('username');
    if (columns.includes('full_name')) selectColumns.push('full_name');
    if (columns.includes('fullName')) selectColumns.push('fullName');
    if (columns.includes('phone')) selectColumns.push('phone');
    if (columns.includes('email')) selectColumns.push('email');
    if (columns.includes('status')) selectColumns.push('status');
    if (columns.includes('lastLogin')) selectColumns.push('lastLogin');
    if (columns.includes('last_login')) selectColumns.push('last_login');
    if (columns.includes('current_task')) selectColumns.push('current_task');
    if (columns.includes('venue_id')) selectColumns.push('venue_id');
    if (columns.includes('created_at')) selectColumns.push('created_at');
    
    if (selectColumns.length === 0) {
      selectColumns.push('*');
    }
    
    const query = `SELECT ${selectColumns.join(', ')} FROM drivers`;
    // Query built dynamically based on available columns
    
    const drivers = db.prepare(query).all();
    
    // Normalize the response
    const normalizedDrivers = drivers.map(d => ({
      id: d.id,
      username: d.username || 'unknown',
      full_name: d.full_name || d.fullName || d.username || 'Unknown',
      fullName: d.full_name || d.fullName || d.username || 'Unknown',
      phone: d.phone || null,
      email: d.email || null,
      status: d.status || 'offline',
      lastLogin: d.lastLogin || d.last_login || null,
      current_task: d.current_task || null,
      venue_id: d.venue_id || null,
    }));
    
    res.json({ success: true, drivers: normalizedDrivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// GET /api/drivers/:id - Get single driver
router.get('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
    
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ 
      success: true, 
      driver: {
        ...driver,
        full_name: driver.full_name || driver.fullName || driver.username,
        fullName: driver.full_name || driver.fullName || driver.username,
        lastLogin: driver.lastLogin || driver.last_login || null,
      }
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drivers - Create driver  
router.post('/', (req, res) => {
  try {
    const db = getDb(req);
    const { username, password, full_name, phone, email, venue_id } = req.body;
    
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    // Check what columns exist
    const tableInfo = db.prepare("PRAGMA table_info(drivers)").all();
    const columns = tableInfo.map(col => col.name);
    
    // Build INSERT based on available columns
    const insertColumns = ['username', 'password'];
    const insertValues = [username, password];
    const placeholders = ['?', '?'];
    
    if (columns.includes('full_name') && full_name) {
      insertColumns.push('full_name');
      insertValues.push(full_name);
      placeholders.push('?');
    }
    if (columns.includes('phone') && phone) {
      insertColumns.push('phone');
      insertValues.push(phone);
      placeholders.push('?');
    }
    if (columns.includes('email') && email) {
      insertColumns.push('email');
      insertValues.push(email);
      placeholders.push('?');
    }
    if (columns.includes('venue_id') && venue_id) {
      insertColumns.push('venue_id');
      insertValues.push(venue_id);
      placeholders.push('?');
    }
    if (columns.includes('status')) {
      insertColumns.push('status');
      insertValues.push('offline');
      placeholders.push('?');
    }
    
    const query = `INSERT INTO drivers (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = db.prepare(query).run(...insertValues);
    
    res.json({ 
      success: true, 
      driver: { 
        id: result.lastInsertRowid, 
        username, 
        full_name: full_name || username,
        status: 'offline'
      } 
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/drivers/:id/status - Update driver status
router.put('/:id/status', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    const { status } = req.body;
    
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status required' });
    }
    
    db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, id);
    
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating driver status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/drivers/:id - Delete driver
router.delete('/:id', (req, res) => {
  try {
    const db = getDb(req);
    const { id } = req.params;
    
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    const result = db.prepare('DELETE FROM drivers WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ success: true, message: 'Driver deleted' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/drivers/login - Driver login
router.post('/login', (req, res) => {
  try {
    const db = getDb(req);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const driver = db.prepare(`
      SELECT id, username, password, fullName, phone, email, status
      FROM drivers WHERE username = ?
    `).get(username);

    if (!driver) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password - support both plain text and SHA256 hash
    const crypto = require('crypto');
    const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
    
    const validPassword = (driver.password === password) || (driver.password === hashedInput);
    
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login and status
    db.prepare(`UPDATE drivers SET lastLogin = datetime('now'), status = 'online' WHERE id = ?`).run(driver.id);

    // Return driver without password
    delete driver.password;
    res.json({ 
      success: true, 
      driver: {
        id: driver.id,
        username: driver.username,
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        status: 'online'
      }
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
