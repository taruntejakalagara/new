/**
 * API Routes Index
 * Main router that aggregates all route modules
 */
const express = require('express');
const router = express.Router();

// Import route modules
const vehiclesRoutes = require('./vehicles');
const retrievalRoutes = require('./retrieval');
const stationRoutes = require('./station');
const paymentRoutes = require('./payment');
const driversRoutes = require('./drivers');
const hooksRoutes = require('./hooks');

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Quick stats endpoint
 * GET /api/stats
 */
router.get('/stats', (req, res) => {
  const db = req.app.get('db');
  try {
    const parkedCount = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'parked'").get();
    const totalCount = db.prepare("SELECT COUNT(*) as count FROM vehicles").get();
    const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM retrieval_requests WHERE status = 'pending'").get();
    const onlineDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'online'").get();
    
    res.json({
      success: true,
      parked: parkedCount?.count || 0,
      total: totalCount?.count || 0,
      pendingRequests: pendingRequests?.count || 0,
      onlineDrivers: onlineDrivers?.count || 0
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get next available hook number
 * GET /api/next-hook
 */
router.get('/next-hook', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    if (hookManager) {
      const nextHook = hookManager.getNextAvailableHook();
      if (nextHook) {
        return res.json({ success: true, hookNumber: nextHook });
      }
    }
    
    // Fallback: count parked vehicles + 1
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM vehicles 
      WHERE status = 'parked'
    `).get();
    
    const nextHook = result.count + 1;
    
    res.json({ 
      success: true,
      hookNumber: nextHook 
    });
  } catch (error) {
    console.error('Error getting next hook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mount route modules
router.use('/vehicles', vehiclesRoutes);
router.use('/retrieval', retrievalRoutes);
router.use('/station', stationRoutes);
router.use('/payment', paymentRoutes);
router.use('/drivers', driversRoutes);
router.use('/hooks', hooksRoutes);

// ============================================
// BACKWARD COMPATIBILITY ROUTES
// These maintain existing endpoint paths
// ============================================

// Backward compat: POST /api/checkin -> vehicles/checkin
router.post('/checkin', (req, res, next) => {
  req.url = '/vehicles/checkin';
  router.handle(req, res, next);
});

// Backward compat: GET /api/vehicles -> vehicles/
router.get('/vehicles', (req, res) => {
  const db = req.app.get('db');
  try {
    const vehicles = db.prepare(`
      SELECT * FROM vehicles 
      WHERE status = 'parked' 
      ORDER BY check_in_time DESC
    `).all();
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: GET /api/vehicles/card/:cardId
router.get('/vehicles/card/:cardId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { cardId } = req.params;
    const vehicle = db.prepare(`
      SELECT * FROM vehicles 
      WHERE unique_card_id = ? AND status = 'parked'
    `).get(cardId);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vehicle not found or already retrieved' 
      });
    }

    const checkin = new Date(vehicle.check_in_time);
    const now = new Date();
    const hours = Math.ceil((now - checkin) / (1000 * 60 * 60));
    const fee = 15 + (Math.max(0, hours - 1) * 5);

    res.json({
      success: true,
      vehicle: { ...vehicle, parking_duration_hours: hours, parking_fee: fee }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/request -> retrieval/request
router.post('/request', (req, res, next) => {
  req.url = '/retrieval/request';
  router.handle(req, res, next);
});

// Backward compat: GET /api/queue -> retrieval/queue
router.get('/queue', (req, res) => {
  const db = req.app.get('db');
  try {
    const requests = db.prepare(`
      SELECT r.*, v.license_plate, v.make, v.model, v.color, v.hook_number
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.status IN ('pending', 'assigned', 'in_progress')
      ORDER BY r.is_priority DESC, r.requested_at ASC
    `).all();
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/complete-retrieval
router.post('/complete-retrieval', (req, res, next) => {
  req.url = '/retrieval/complete';
  router.handle(req, res, next);
});

// Backward compat: GET /api/pending-handovers
router.get('/pending-handovers', (req, res) => {
  const db = req.app.get('db');
  try {
    const handovers = db.prepare(`
      SELECT r.*, v.license_plate, v.make, v.model, v.color, v.hook_number
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.status = 'ready'
      ORDER BY r.car_ready_at ASC
    `).all();
    res.json({ success: true, handovers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: GET /api/pricing
router.get('/pricing', (req, res, next) => {
  req.url = '/payment/pricing';
  router.handle(req, res, next);
});

// Backward compat: POST /api/pricing
router.post('/pricing', (req, res, next) => {
  req.url = '/payment/pricing';
  router.handle(req, res, next);
});

// Backward compat: GET /api/overview
router.get('/overview', (req, res, next) => {
  req.url = '/station/overview';
  router.handle(req, res, next);
});

// Backward compat: GET /api/analytics
router.get('/analytics', (req, res, next) => {
  req.url = '/station/analytics';
  router.handle(req, res, next);
});

// Backward compat: GET /api/daily-report
router.get('/daily-report', (req, res, next) => {
  req.url = '/station/daily-report';
  router.handle(req, res, next);
});

// Backward compat: GET /api/cash-payments
router.get('/cash-payments', (req, res, next) => {
  req.url = '/station/cash-payments';
  router.handle(req, res, next);
});

// Backward compat: POST /api/payment/process
router.post('/payment/process', (req, res, next) => {
  // Already at correct path
  next();
});

// Backward compat: POST /api/queue/:taskId/accept
router.post('/queue/:taskId/accept', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET assigned_driver_id = ?, status = 'assigned', assigned_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(driverId, taskId);
    
    res.json({ success: true, message: 'Task accepted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/retrieval/:taskId/complete
router.post('/retrieval/:taskId/complete', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { driverId } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', car_ready_at = datetime('now')
      WHERE id = ? AND assigned_driver_id = ?
    `).run(taskId, driverId);
    
    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/retrieval/:taskId/car-ready
router.post('/retrieval/:taskId/car-ready', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'ready', car_ready_at = datetime('now')
      WHERE id = ?
    `).run(taskId);
    
    res.json({ success: true, message: 'Car marked as ready' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/retrieval/:taskId/collect-cash
router.post('/retrieval/:taskId/collect-cash', (req, res) => {
  const db = req.app.get('db');
  try {
    const { taskId } = req.params;
    const { amount } = req.body;
    
    db.prepare(`
      UPDATE retrieval_requests 
      SET payment_method = 'cash', payment_processed = 1, amount = ?
      WHERE id = ?
    `).run(amount || 15, taskId);
    
    res.json({ success: true, message: 'Cash collected' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/retrieval/:taskId/handover-keys
router.post('/retrieval/:taskId/handover-keys', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { taskId } = req.params;
    
    const request = db.prepare(`
      SELECT r.*, v.hook_number, v.unique_card_id 
      FROM retrieval_requests r
      JOIN vehicles v ON r.unique_card_id = v.unique_card_id
      WHERE r.id = ?
    `).get(taskId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    db.prepare(`
      UPDATE retrieval_requests 
      SET status = 'completed', keys_handed_at = datetime('now'), completed_at = datetime('now')
      WHERE id = ?
    `).run(taskId);

    db.prepare(`
      UPDATE vehicles SET status = 'retrieved', check_out_time = datetime('now')
      WHERE unique_card_id = ?
    `).run(request.unique_card_id);

    if (request.hook_number && hookManager) {
      hookManager.releaseHook(request.hook_number);
    }
    
    res.json({ success: true, message: 'Keys handed over' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: GET /api/hooks/next
router.get('/hooks/next', (req, res) => {
  const db = req.app.get('db');
  try {
    const hook = db.prepare(`
      SELECT * FROM hooks 
      WHERE status = 'available' 
      ORDER BY hook_number ASC 
      LIMIT 1
    `).get();
    
    if (!hook) {
      return res.json({ success: false, message: 'No available hooks' });
    }
    
    res.json({ success: true, hook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: GET /api/hooks/next-available
router.get('/hooks/next-available', (req, res) => {
  const db = req.app.get('db');
  try {
    const hook = db.prepare(`
      SELECT * FROM hooks 
      WHERE status = 'available' 
      AND reserved_for_card IS NULL
      ORDER BY hook_number ASC 
      LIMIT 1
    `).get();
    
    if (!hook) {
      return res.json({ success: false, message: 'No available hooks' });
    }
    
    res.json({ success: true, hook });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/hooks/reserve
router.post('/hooks/reserve', (req, res) => {
  const db = req.app.get('db');
  try {
    const { hook_number, card_id } = req.body;
    
    db.prepare(`
      UPDATE hooks 
      SET reserved_for_card = ?, reserved_at = datetime('now')
      WHERE hook_number = ?
    `).run(card_id, hook_number);
    
    res.json({ success: true, message: 'Hook reserved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: POST /api/hooks/release
router.post('/hooks/release', (req, res) => {
  const db = req.app.get('db');
  const hookManager = req.app.get('hookManager');
  
  try {
    const { hook_number } = req.body;
    
    if (hookManager) {
      hookManager.releaseHook(hook_number);
    } else {
      db.prepare(`
        UPDATE hooks 
        SET status = 'available', reserved_for_card = NULL, reserved_at = NULL 
        WHERE hook_number = ?
      `).run(hook_number);
    }
    
    res.json({ success: true, message: `Hook ${hook_number} released` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: Driver stats routes
router.get('/drivers/stats/:driverId', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE assigned_driver_id = ? AND status = 'completed' AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests 
      WHERE assigned_driver_id = ? AND status = 'completed' AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    res.json({
      success: true,
      stats: {
        completedToday: completed?.count || 0,
        tipsToday: tips?.total || 0,
        rating: 4.8
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/drivers/:driverId/stats', (req, res) => {
  const db = req.app.get('db');
  try {
    const { driverId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM retrieval_requests 
      WHERE assigned_driver_id = ? AND status = 'completed' AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    const tips = db.prepare(`
      SELECT COALESCE(SUM(tip_amount), 0) as total FROM retrieval_requests 
      WHERE assigned_driver_id = ? AND status = 'completed' AND DATE(completed_at) = ?
    `).get(driverId, today);
    
    res.json({
      success: true,
      stats: {
        completedToday: completed?.count || 0,
        tipsToday: tips?.total || 0,
        rating: 4.8
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: Driver login (legacy endpoint in api.js)
router.post('/drivers/login', (req, res) => {
  const db = req.app.get('db');
  const { username, name, pin } = req.body;
  const driverName = username || name;
  
  try {
    const driver = db.prepare('SELECT * FROM drivers WHERE fullName = ? OR username = ?').get(driverName, driverName);
    
    if (driver) {
      db.prepare("UPDATE drivers SET lastLogin = datetime('now'), status = 'online' WHERE id = ?").run(driver.id);
      
      res.json({ 
        success: true, 
        driver: {
          id: driver.id,
          name: driver.fullName || driver.username,
          phone: driver.phone,
          status: 'online'
        }
      });
    } else {
      const result = db.prepare("INSERT INTO drivers (username, fullName, password, phone, status) VALUES (?, ?, 'temp', '0000000000', 'online')").run(driverName, driverName);
      
      res.json({ 
        success: true, 
        driver: {
          id: result.lastInsertRowid,
          name: driverName,
          status: 'online'
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compat: Driver logout
router.post('/driver/logout', (req, res) => {
  const { driverId } = req.body;
  const db = req.app.get('db');
  
  try {
    db.prepare("UPDATE drivers SET status = 'offline' WHERE id = ?").run(driverId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/drivers/logout', (req, res) => {
  const { driverId } = req.body;
  const db = req.app.get('db');
  
  try {
    db.prepare("UPDATE drivers SET status = 'offline' WHERE id = ?").run(driverId);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('driverStatusChanged', { driverId, status: 'offline' });
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
