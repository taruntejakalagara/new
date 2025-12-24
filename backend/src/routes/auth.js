const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const db = req.db || req.app.locals.db || req.app.get('db');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const manager = db.prepare('SELECT * FROM managers WHERE username = ?').get(username);

    if (!manager) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, manager.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    db.prepare('UPDATE managers SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(manager.id);

    res.json({
      success: true,
      manager: {
        id: manager.id,
        username: manager.username,
        full_name: manager.full_name,
        fullName: manager.full_name,
        role: manager.role,
        venue_id: manager.venue_id,
      },
      token: `mgr_${manager.id}_${Date.now()}`
    });
  } catch (error) {
    console.error('Auth login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  res.status(401).json({ success: false, error: 'Not authenticated' });
});

module.exports = router;
