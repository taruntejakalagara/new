const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/drivers - Register new driver
router.post('/', (req, res) => {
  const db = req.app.get('db');
  const {
    fullName,
    username,
    password,
    phone,
    email,
    licenseNumber,
    vehicleInfo,
    emergencyContact,
    emergencyPhone
  } = req.body;

  // Validate required fields
  if (!fullName || !username || !password || !phone) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: fullName, username, password, phone' 
    });
  }

  try {
    // Check if username already exists
    const existingDriver = db.prepare(
      'SELECT id FROM drivers WHERE username = ?'
    ).get(username);

    if (existingDriver) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();

    // Insert new driver
    const stmt = db.prepare(`
      INSERT INTO drivers (
        fullName, username, password, phone, email, 
        licenseNumber, vehicleInfo, emergencyContact, emergencyPhone,
        status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      fullName,
      username,
      hashedPassword,
      phone,
      email || null,
      licenseNumber || null,
      vehicleInfo || null,
      emergencyContact || null,
      emergencyPhone || null,
      'active',
      now
    );

    res.json({ 
      success: true, 
      message: 'Driver registered successfully',
      driverId: result.lastInsertRowid
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering driver',
      error: error.message 
    });
  }
});

// POST /api/drivers/register - Alias for driver registration (used by station dashboard)
router.post('/register', (req, res) => {
  const db = req.app.get('db');
  const {
    fullName,
    full_name,
    username,
    password,
    phone,
    email,
    licenseNumber,
    license_number,
    vehicleInfo,
    emergencyContact,
    emergencyPhone
  } = req.body;

  // Support both camelCase and snake_case
  const name = fullName || full_name;
  const license = licenseNumber || license_number;

  // Validate required fields
  if (!name || !username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: fullName, username, password' 
    });
  }

  try {
    // Check if username already exists
    const existingDriver = db.prepare(
      'SELECT id FROM drivers WHERE username = ?'
    ).get(username);

    if (existingDriver) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();

    // Insert new driver
    const stmt = db.prepare(`
      INSERT INTO drivers (
        fullName, username, password, phone, email, 
        licenseNumber, vehicleInfo, emergencyContact, emergencyPhone,
        status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      username,
      hashedPassword,
      phone || null,
      email || null,
      license || null,
      vehicleInfo || null,
      emergencyContact || null,
      emergencyPhone || null,
      'active',
      now
    );

    res.json({ 
      success: true, 
      message: 'Driver registered successfully',
      driverId: result.lastInsertRowid,
      driver: {
        id: result.lastInsertRowid,
        fullName: name,
        username: username,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering driver',
      error: error.message 
    });
  }
});

// POST /api/drivers/login - Driver login
router.post('/login', (req, res) => {
  const db = req.app.get('db');
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password required' 
    });
  }

  try {
    const hashedPassword = hashPassword(password);
    
    const driver = db.prepare(`
      SELECT id, fullName, username, phone, email, status, licenseNumber, vehicleInfo
      FROM drivers 
      WHERE username = ? AND password = ?
    `).get(username, hashedPassword);

    if (!driver) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Accept both 'active' and 'online' status for login
    if (driver.status !== 'active' && driver.status !== 'online' && driver.status !== 'available') {
      return res.status(403).json({ 
        success: false, 
        message: 'Driver account is not active' 
      });
    }

    // Update last login
    const now = new Date().toISOString();
    db.prepare('UPDATE drivers SET lastLogin = ? WHERE id = ?')
      .run(now, driver.id);

    // Update driver status to online
    db.prepare('UPDATE drivers SET status = ? WHERE id = ?')
      .run('online', driver.id);

    res.json({ 
      success: true, 
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        username: driver.username,
        phone: driver.phone,
        email: driver.email,
        status: 'online'
      }
    });

  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login error',
      error: error.message 
    });
  }
});

// POST /api/drivers/logout - Driver logout
router.post('/logout', (req, res) => {
  const db = req.app.get('db');
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Driver ID required' 
    });
  }

  try {
    db.prepare('UPDATE drivers SET status = ? WHERE id = ?')
      .run('active', driverId);

    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Driver logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout error',
      error: error.message 
    });
  }
});

// GET /api/drivers - Get all drivers
router.get('/', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const drivers = db.prepare(`
      SELECT id, fullName, username, phone, email, status, 
             licenseNumber, vehicleInfo, emergencyContact, emergencyPhone,
             createdAt, lastLogin
      FROM drivers 
      ORDER BY createdAt DESC
    `).all();

    res.json({ success: true, drivers });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching drivers',
      error: error.message 
    });
  }
});

// GET /api/drivers/:id - Get single driver
router.get('/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const driver = db.prepare(`
      SELECT id, fullName, username, phone, email, status, 
             licenseNumber, vehicleInfo, emergencyContact, emergencyPhone,
             createdAt, lastLogin
      FROM drivers 
      WHERE id = ?
    `).get(id);

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    res.json({ success: true, driver });

  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching driver',
      error: error.message 
    });
  }
});

// PUT /api/drivers/:id - Update driver
router.put('/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const {
    fullName,
    phone,
    email,
    licenseNumber,
    vehicleInfo,
    emergencyContact,
    emergencyPhone,
    status
  } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE drivers 
      SET fullName = ?, phone = ?, email = ?, 
          licenseNumber = ?, vehicleInfo = ?, 
          emergencyContact = ?, emergencyPhone = ?, status = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      fullName,
      phone,
      email || null,
      licenseNumber || null,
      vehicleInfo || null,
      emergencyContact || null,
      emergencyPhone || null,
      status || 'active',
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Driver updated successfully' 
    });

  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating driver',
      error: error.message 
    });
  }
});


// DELETE /api/drivers/:id - Delete driver
router.delete('/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    // Check if driver has active tasks
    const activeTasks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
      AND status IN ('assigned', 'retrieving')
    `).get(id);

    if (activeTasks.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete driver with active tasks. Please complete or reassign tasks first.' 
      });
    }

    // Unassign driver from all requests
    const unassignResult = db.prepare(`
      UPDATE retrieval_requests 
      SET assigned_driver_id = NULL 
      WHERE assigned_driver_id = ?
    `).run(id);

    console.log('Unassigned driver from', unassignResult.changes, 'requests');

    // Now delete the driver
    const result = db.prepare('DELETE FROM drivers WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Driver deleted successfully' 
    });

  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message
    });
  }
});

// GET /api/drivers/stats/:id - Get driver statistics
router.get('/stats/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Completed today by this driver
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
        AND status = 'completed' 
        AND DATE(completed_at, 'localtime') = ?
    `).get(id, today);
    
    // Active tasks (vehicles waiting in retrieval queue)
    const activeTasks = db.prepare(`
      SELECT COUNT(*) as count 
      FROM retrieval_requests 
      WHERE status = 'pending'
    `).get();
    
    // Pending handovers (retrieving status, ready to hand over)
    const pendingHandovers = db.prepare(`
      SELECT COUNT(*) as count 
      FROM retrieval_requests 
      WHERE assigned_driver_id = ? 
        AND status = 'retrieving'
    `).get(id);

    res.json({ 
      success: true, 
      stats: {
        completedToday: completedToday.count || 0,
        activeTasks: activeTasks.count || 0,
        pendingHandovers: pendingHandovers.count || 0
      }
    });

  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching driver stats',
      error: error.message 
    });
  }
});

module.exports = router;
