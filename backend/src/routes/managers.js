const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// GET /api/managers - List all managers
router.get('/', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const managers = db.prepare(`
      SELECT id, username, full_name, email, role, status, created_at, last_login
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
  const { id } = req.params;
  
  try {
    const manager = db.prepare(`
      SELECT id, username, full_name, email, role, status, created_at, last_login
      FROM managers WHERE id = ?
    `).get(id);
    
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    
    res.json({ success: true, manager });
  } catch (error) {
    console.error('Error fetching manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/managers - Create new manager
router.post('/', async (req, res) => {
  const db = req.app.get('db');
  const { username, password, fullName, email, role = 'manager' } = req.body;
  
  if (!username || !password || !fullName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username, password, and full name are required' 
    });
  }
  
  try {
    // Check if username exists
    const existing = db.prepare('SELECT id FROM managers WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = db.prepare(`
      INSERT INTO managers (username, password, full_name, email, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(username, hashedPassword, fullName, email || null, role);
    
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
router.put('/:id', async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { fullName, email, role, password } = req.body;
  
  try {
    const manager = db.prepare('SELECT id FROM managers WHERE id = ?').get(id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (fullName) {
      updates.push('full_name = ?');
      values.push(fullName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email || null);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(id);
    db.prepare(`UPDATE managers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    res.json({ success: true, message: 'Manager updated successfully' });
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/managers/:id/status - Toggle manager status
router.patch('/:id/status', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  
  try {
    const manager = db.prepare('SELECT id FROM managers WHERE id = ?').get(id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    
    db.prepare('UPDATE managers SET status = ? WHERE id = ?').run(status, id);
    
    res.json({ success: true, message: `Manager ${status === 'active' ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Error updating manager status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/managers/:id - Delete manager
router.delete('/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  
  try {
    const manager = db.prepare('SELECT id FROM managers WHERE id = ?').get(id);
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Manager not found' });
    }
    
    db.prepare('DELETE FROM managers WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Manager deleted successfully' });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/managers/login - Manager login
router.post('/login', async (req, res) => {
  const db = req.app.get('db');
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }
  
  try {
    const manager = db.prepare(`
      SELECT id, username, password, full_name, email, role, status
      FROM managers WHERE username = ?
    `).get(username);
    
    if (!manager) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    if (manager.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }
    
    const validPassword = await bcrypt.compare(password, manager.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Update last login
    db.prepare('UPDATE managers SET last_login = datetime(\'now\') WHERE id = ?').run(manager.id);
    
    // Don't send password back
    delete manager.password;
    
    res.json({ success: true, manager });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
