const express = require('express');
const router = express.Router();

// Try to use bcrypt, fall back to bcryptjs
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  try {
    bcrypt = require('bcryptjs');
  } catch {
    // Simple fallback if neither is available
    bcrypt = {
      hashSync: (password) => password,
      compareSync: (password, hash) => password === hash
    };
  }
}

// Ensure managers table has all required columns
function ensureManagersTable(db) {
  // Create table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS managers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT DEFAULT 'manager',
      venue_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check existing columns
  const columns = db.prepare("PRAGMA table_info(managers)").all();
  const columnNames = columns.map(c => c.name);

  // Add missing columns (SQLite requires constant defaults for ALTER TABLE)
  if (!columnNames.includes('password')) {
    console.log('Adding password column to managers table...');
    db.exec("ALTER TABLE managers ADD COLUMN password TEXT");
  }
  if (!columnNames.includes('full_name')) {
    console.log('Adding full_name column to managers table...');
    db.exec("ALTER TABLE managers ADD COLUMN full_name TEXT");
  }
  if (!columnNames.includes('email')) {
    db.exec("ALTER TABLE managers ADD COLUMN email TEXT");
  }
  if (!columnNames.includes('phone')) {
    db.exec("ALTER TABLE managers ADD COLUMN phone TEXT");
  }
  if (!columnNames.includes('role')) {
    db.exec("ALTER TABLE managers ADD COLUMN role TEXT DEFAULT 'manager'");
  }
  if (!columnNames.includes('venue_id')) {
    db.exec("ALTER TABLE managers ADD COLUMN venue_id INTEGER");
  }
  if (!columnNames.includes('status')) {
    db.exec("ALTER TABLE managers ADD COLUMN status TEXT DEFAULT 'active'");
  }
  if (!columnNames.includes('created_at')) {
    db.exec("ALTER TABLE managers ADD COLUMN created_at TEXT");
  }
  if (!columnNames.includes('updated_at')) {
    db.exec("ALTER TABLE managers ADD COLUMN updated_at TEXT");
  }

  // Set defaults for NULL values
  db.exec("UPDATE managers SET status = 'active' WHERE status IS NULL");
  db.exec("UPDATE managers SET role = 'manager' WHERE role IS NULL");

  // Create default admin if no managers exist
  const count = db.prepare("SELECT COUNT(*) as count FROM managers").get();
  if (count.count === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO managers (username, password, full_name, email, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run('admin', hashedPassword, 'Administrator', 'admin@valet.com', 'admin', 'active');
    console.log('✅ Created default admin user (username: admin, password: admin123)');
  }

  // Check if any manager has empty password and set a default
  const managersWithoutPassword = db.prepare("SELECT id, username FROM managers WHERE password IS NULL OR password = ''").all();
  if (managersWithoutPassword.length > 0) {
    const defaultPassword = bcrypt.hashSync('password123', 10);
    db.prepare("UPDATE managers SET password = ? WHERE password IS NULL OR password = ''").run(defaultPassword);
    console.log(`✅ Set default password for ${managersWithoutPassword.length} managers (password: password123)`);
  }

  // Set full_name from username if missing
  db.exec("UPDATE managers SET full_name = username WHERE full_name IS NULL OR full_name = ''");
}

// GET /api/managers - List all managers
router.get('/', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const managers = db.prepare(`
      SELECT id, username, full_name, email, phone, role, venue_id, status, created_at, updated_at
      FROM managers
      ORDER BY created_at DESC
    `).all();
    
    res.json({ success: true, managers });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/managers/:id - Get single manager
router.get('/:id', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const manager = db.prepare(`
      SELECT id, username, full_name, email, phone, role, venue_id, status, created_at, updated_at
      FROM managers WHERE id = ?
    `).get(req.params.id);
    
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    
    res.json({ success: true, manager });
  } catch (error) {
    console.error('Error fetching manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/managers - Create manager
router.post('/', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const { username, password, full_name, email, phone, role, venue_id } = req.body;
    
    if (!username || !password || !full_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and full name are required' 
      });
    }

    // Check if username exists
    const existing = db.prepare("SELECT id FROM managers WHERE username = ?").get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = db.prepare(`
      INSERT INTO managers (username, password, full_name, email, phone, role, venue_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(username, hashedPassword, full_name, email || null, phone || null, role || 'manager', venue_id || null);

    res.json({ 
      success: true, 
      message: 'Manager created successfully',
      managerId: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Error creating manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/managers/:id - Update manager
router.put('/:id', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const { username, password, full_name, email, phone, role, venue_id } = req.body;
    const { id } = req.params;

    // Check if manager exists
    const existing = db.prepare("SELECT id FROM managers WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    // Check if new username conflicts
    if (username) {
      const conflict = db.prepare("SELECT id FROM managers WHERE username = ? AND id != ?").get(username, id);
      if (conflict) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
      }
    }

    // Build update query
    let updateFields = [];
    let params = [];

    if (username) { updateFields.push('username = ?'); params.push(username); }
    if (password) { updateFields.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }
    if (full_name) { updateFields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { updateFields.push('email = ?'); params.push(email || null); }
    if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone || null); }
    if (role) { updateFields.push('role = ?'); params.push(role); }
    if (venue_id !== undefined) { updateFields.push('venue_id = ?'); params.push(venue_id || null); }
    
    updateFields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE managers SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

    res.json({ success: true, message: 'Manager updated successfully' });
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/managers/:id/status - Toggle status
router.patch('/:id/status', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const { status } = req.body;
    const { id } = req.params;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = db.prepare(`
      UPDATE managers SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    res.json({ success: true, message: `Manager ${status === 'active' ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/managers/:id - Delete manager
router.delete('/:id', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const result = db.prepare("DELETE FROM managers WHERE id = ?").run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }

    res.json({ success: true, message: 'Manager deleted successfully' });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/managers/login - Login
router.post('/login', (req, res) => {
  const db = req.app.get('db');
  try {
    ensureManagersTable(db);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const manager = db.prepare(`
      SELECT id, username, password, full_name, email, phone, role, venue_id, status
      FROM managers WHERE username = ?
    `).get(username);

    if (!manager) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (manager.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, manager.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Return manager without password
    delete manager.password;
    res.json({ success: true, manager });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
