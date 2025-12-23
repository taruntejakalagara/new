// Driver Authentication API Routes
// Add these endpoints to your backend API

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // You'll need to install: npm install bcryptjs

// Driver Login
router.post('/drivers/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone and password are required' 
      });
    }

    // Find driver by phone number
    const driver = await db.get(
      'SELECT * FROM drivers WHERE phone = ?',
      [phone]
    );

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found. Please contact station to register.' 
      });
    }

    // Check if driver is active
    if (driver.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is inactive. Please contact your supervisor.' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

    // Login successful
    res.json({
      success: true,
      message: 'Login successful',
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        status: driver.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Register Driver (Station Manager only)
router.post('/drivers/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, phone, and password are required' 
      });
    }

    // Check if driver already exists
    const existingDriver = await db.get(
      'SELECT * FROM drivers WHERE phone = ?',
      [phone]
    );

    if (existingDriver) {
      return res.status(409).json({ 
        success: false, 
        message: 'Driver with this phone number already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new driver
    const result = await db.run(
      `INSERT INTO drivers (name, phone, email, password_hash, status) 
       VALUES (?, ?, ?, ?, 'inactive')`,
      [name, phone, email || null, password_hash]
    );

    res.json({
      success: true,
      message: 'Driver registered successfully',
      driver: {
        id: result.lastID,
        name,
        phone,
        email,
        status: 'inactive'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Get Driver Stats
router.get('/drivers/:id/stats', async (req, res) => {
  try {
    const driverId = req.params.id;

    // Get today's completed count
    const todayCount = await db.get(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE driver_id = ? AND DATE(check_in_time) = DATE('now') AND status = 'completed'`,
      [driverId]
    );

    // Get pending tasks assigned to this driver
    const pendingTasks = await db.get(
      `SELECT COUNT(*) as count FROM requests 
       WHERE driver_id = ? AND status IN ('assigned', 'in_transit')`,
      [driverId]
    );

    // Get active vehicles (parked, not yet completed)
    const activeVehicles = await db.get(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE status IN ('parked', 'requested', 'in_transit', 'arrived')`,
      []
    );

    res.json({
      success: true,
      pendingTasks: pendingTasks.count || 0,
      todayCount: todayCount.count || 0,
      activeVehicles: activeVehicles.count || 0
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats' 
    });
  }
});

// Toggle Driver Status (Station Manager only)
router.put('/drivers/:id/status', async (req, res) => {
  try {
    const driverId = req.params.id;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status must be either "active" or "inactive"' 
      });
    }

    await db.run(
      'UPDATE drivers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, driverId]
    );

    res.json({
      success: true,
      message: `Driver status updated to ${status}`
    });

  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating driver status' 
    });
  }
});

// Get All Drivers (Station Manager only)
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await db.all(
      `SELECT id, name, phone, email, status, created_at 
       FROM drivers ORDER BY name ASC`
    );

    res.json({
      success: true,
      drivers
    });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching drivers' 
    });
  }
});

module.exports = router;

// Logout endpoint
router.post('/driver/logout', async (req, res) => {
  try {
    const { driverId } = req.body;
    const db = req.app.get('db');
    
    const stmt = db.prepare('UPDATE drivers SET status = ? WHERE id = ?');
    stmt.run('offline', driverId);
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Status update endpoint (POST version for frontend)
router.post('/driver/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = req.app.get('db');
    
    const stmt = db.prepare('UPDATE drivers SET status = ? WHERE id = ?');
    stmt.run(status, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pending handovers endpoint
router.get('/pending-handovers', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const requests = db.prepare(`
      SELECT * FROM retrieval_requests 
      WHERE status = 'ready_for_pickup'
      ORDER BY ready_at DESC
    `).all();
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Handovers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

