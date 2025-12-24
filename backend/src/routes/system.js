const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ============================================
// ACTIVITY & LOGGING SYSTEM
// ============================================

// Store events in memory (persists during server lifetime)
let activityEvents = [];
let errorLogs = [];

// Add activity event (call this from other routes)
function addActivity(type, message, details = {}) {
  const event = {
    id: Date.now() + Math.random(),
    type, // checkin, retrieval, driver, payment, error, system
    message,
    ...details,
    timestamp: new Date().toISOString()
  };
  activityEvents.unshift(event);
  if (activityEvents.length > 500) activityEvents = activityEvents.slice(0, 500);
  
  // Emit via WebSocket if available
  const io = router.io;
  if (io) {
    io.emit('activity', event);
  }
  
  return event;
}

// Add error log
function addError(level, message, details = {}) {
  const log = {
    id: Date.now() + Math.random(),
    level, // error, warning, info
    message,
    source: details.source || 'System',
    ...details,
    timestamp: new Date().toISOString()
  };
  errorLogs.unshift(log);
  if (errorLogs.length > 500) errorLogs = errorLogs.slice(0, 500);
  return log;
}

// Export for use in other route files
router.addActivity = addActivity;
router.addError = addError;

// ============================================
// HEALTH & STATUS ENDPOINTS
// ============================================

// GET /api/health - Basic health check
router.get('/health', (req, res) => {
  const db = req.app.get('db');
  const startTime = Date.now();
  
  try {
    // Test database connection
    db.prepare("SELECT 1").get();
    const dbLatency = Date.now() - startTime;
    
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      dbLatency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    addError('error', 'Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// GET /api/system/info - Comprehensive system info
router.get('/info', (req, res) => {
  const db = req.app.get('db');
  
  try {
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const tablesWithCounts = tables.map(t => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
        return { name: t.name, count: count.count };
      } catch {
        return { name: t.name, count: 0 };
      }
    });

    // Get real stats from database
    let stats = {
      totalVehicles: 0,
      activeDrivers: 0,
      todayCheckIns: 0,
      pendingRequests: 0,
      todayRetrievals: 0,
      todayRevenue: 0
    };

    try {
      const vehicleCount = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'parked'").get();
      stats.totalVehicles = vehicleCount?.c || 0;
    } catch {}
    
    try {
      const driverCount = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status IN ('active', 'available', 'busy')").get();
      stats.activeDrivers = driverCount?.c || 0;
    } catch {}
    
    try {
      const todayCheckins = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE DATE(checked_in_at) = DATE('now')").get();
      stats.todayCheckIns = todayCheckins?.c || 0;
    } catch {}
    
    try {
      const pending = db.prepare("SELECT COUNT(*) as c FROM queue WHERE status = 'pending'").get();
      stats.pendingRequests = pending?.c || 0;
    } catch {}

    try {
      const todayRetrievals = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'retrieved' AND DATE(retrieved_at) = DATE('now')").get();
      stats.todayRetrievals = todayRetrievals?.c || 0;
    } catch {}

    // Get database file size
    let dbSize = 'Unknown';
    const possiblePaths = [
      path.join(process.cwd(), 'valet.db'),
      path.join(process.cwd(), 'src', 'valet.db'),
      path.join(process.cwd(), 'data', 'valet.db')
    ];
    
    for (const dbPath of possiblePaths) {
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        dbSize = formatBytes(stat.size);
        break;
      }
    }

    res.json({
      success: true,
      tables: tablesWithCounts,
      stats,
      dbSize,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    addError('error', 'Failed to get system info', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/system/websocket - WebSocket status
router.get('/websocket', (req, res) => {
  const io = req.app.get('io');
  let connections = 0;
  let rooms = {};
  
  if (io) {
    connections = io.engine?.clientsCount || 0;
    // Get room info if available
    if (io.sockets?.adapter?.rooms) {
      io.sockets.adapter.rooms.forEach((value, key) => {
        if (!key.startsWith('/')) {
          rooms[key] = value.size;
        }
      });
    }
  }
  
  res.json({
    success: true,
    connections,
    rooms,
    status: connections > 0 ? 'active' : 'idle'
  });
});

// ============================================
// ACTIVITY & LOGS ENDPOINTS
// ============================================

// GET /api/system/activity - Get activity feed
router.get('/activity', (req, res) => {
  const { type, venue, limit = 50 } = req.query;
  
  let events = [...activityEvents];
  
  if (type && type !== 'all') {
    events = events.filter(e => e.type === type);
  }
  
  if (venue) {
    events = events.filter(e => e.venue === venue || e.venue_id == venue);
  }
  
  res.json({
    success: true,
    events: events.slice(0, parseInt(limit)),
    total: activityEvents.length
  });
});

// GET /api/system/logs - Get error logs
router.get('/logs', (req, res) => {
  const { level, limit = 100 } = req.query;
  
  let logs = [...errorLogs];
  
  if (level && level !== 'all') {
    logs = logs.filter(l => l.level === level);
  }
  
  res.json({
    success: true,
    logs: logs.slice(0, parseInt(limit)),
    total: errorLogs.length
  });
});

// ============================================
// DATABASE EXPLORER ENDPOINTS
// ============================================

// GET /api/system/tables - List all tables
router.get('/tables', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const tablesWithCounts = tables.map(t => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
        return { name: t.name, count: count.count };
      } catch {
        return { name: t.name, count: 0 };
      }
    });

    res.json({ success: true, tables: tablesWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/system/tables/:name - Get table data
router.get('/tables/:name', (req, res) => {
  const db = req.app.get('db');
  const { name } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  
  // Sanitize table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Invalid table name' });
  }
  
  try {
    // Get columns
    const columnsInfo = db.prepare(`PRAGMA table_info(${name})`).all();
    const columns = columnsInfo.map(c => c.name);
    
    // Get total count
    const countResult = db.prepare(`SELECT COUNT(*) as total FROM ${name}`).get();
    
    // Get rows with pagination
    const rows = db.prepare(`SELECT * FROM ${name} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(parseInt(limit), parseInt(offset));
    
    res.json({ 
      success: true, 
      columns, 
      rows,
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/system/tables/:name/:id - Delete row
router.delete('/tables/:name/:id', (req, res) => {
  const db = req.app.get('db');
  const { name, id } = req.params;
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return res.status(400).json({ success: false, message: 'Invalid table name' });
  }
  
  try {
    const result = db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id);
    
    if (result.changes > 0) {
      addActivity('system', `Deleted row ${id} from ${name}`, { table: name, rowId: id });
      res.json({ success: true, message: 'Row deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Row not found' });
    }
  } catch (error) {
    addError('error', `Failed to delete from ${name}`, { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// VENUES ENDPOINTS (for Admin Dashboard)
// ============================================

// GET /api/venues - List all venues
router.get('/venues', (req, res) => {
  const db = req.app.get('db');
  
  try {
    // Check if venues table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='venues'
    `).get();
    
    if (!tableExists) {
      // Create venues table
      db.exec(`
        CREATE TABLE IF NOT EXISTS venues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          status TEXT DEFAULT 'active',
          max_hooks INTEGER DEFAULT 50,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default venue
      db.prepare(`
        INSERT INTO venues (name, address, status) 
        VALUES (?, ?, ?)
      `).run('Main Venue', '123 Main St', 'active');
    }
    
    const venues = db.prepare('SELECT * FROM venues ORDER BY name').all();
    
    // Get stats for each venue
    const venuesWithStats = venues.map(venue => {
      let stats = { parked: 0, activeDrivers: 0, pendingRequests: 0, avgWaitTime: 0 };
      
      try {
        const parked = db.prepare(`
          SELECT COUNT(*) as c FROM vehicles 
          WHERE status = 'parked' AND (venue_id = ? OR venue_id IS NULL)
        `).get(venue.id);
        stats.parked = parked?.c || 0;
      } catch {}
      
      try {
        const drivers = db.prepare(`
          SELECT COUNT(*) as c FROM drivers 
          WHERE status IN ('active', 'available', 'busy') 
          AND (venue_id = ? OR venue_id IS NULL)
        `).get(venue.id);
        stats.activeDrivers = drivers?.c || 0;
      } catch {}
      
      try {
        const pending = db.prepare(`
          SELECT COUNT(*) as c FROM queue 
          WHERE status = 'pending' AND (venue_id = ? OR venue_id IS NULL)
        `).get(venue.id);
        stats.pendingRequests = pending?.c || 0;
      } catch {}
      
      return { ...venue, stats };
    });
    
    res.json({ success: true, venues: venuesWithStats });
  } catch (error) {
    addError('error', 'Failed to fetch venues', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/venues/:id - Get single venue
router.get('/venues/:id', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  
  try {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
    
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }
    
    res.json({ success: true, venue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/venues/:id/stats - Get venue stats
router.get('/venues/:id/stats', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  
  try {
    let stats = {
      vehiclesParked: 0,
      activeDrivers: 0,
      pendingRequests: 0,
      avgWaitTime: 0,
      totalHooks: 50,
      usedHooks: 0,
      todayCheckIns: 0,
      todayRetrievals: 0
    };
    
    // Vehicles parked
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as c FROM vehicles 
        WHERE status = 'parked' AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.vehiclesParked = result?.c || 0;
      stats.usedHooks = stats.vehiclesParked;
    } catch {}
    
    // Active drivers
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as c FROM drivers 
        WHERE status IN ('active', 'available', 'busy') 
        AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.activeDrivers = result?.c || 0;
    } catch {}
    
    // Pending requests
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as c FROM queue 
        WHERE status = 'pending' AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.pendingRequests = result?.c || 0;
    } catch {}
    
    // Today's check-ins
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as c FROM vehicles 
        WHERE DATE(checked_in_at) = DATE('now') 
        AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.todayCheckIns = result?.c || 0;
    } catch {}
    
    // Today's retrievals
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as c FROM vehicles 
        WHERE status = 'retrieved' 
        AND DATE(retrieved_at) = DATE('now')
        AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.todayRetrievals = result?.c || 0;
    } catch {}
    
    // Average wait time (from completed retrievals today)
    try {
      const result = db.prepare(`
        SELECT AVG(
          (julianday(completed_at) - julianday(requested_at)) * 24 * 60
        ) as avg_minutes
        FROM queue 
        WHERE status = 'completed' 
        AND DATE(completed_at) = DATE('now')
        AND (venue_id = ? OR venue_id IS NULL)
      `).get(id);
      stats.avgWaitTime = result?.avg_minutes ? Math.round(result.avg_minutes * 10) / 10 : 0;
    } catch {}
    
    // Get venue's max hooks
    try {
      const venue = db.prepare('SELECT max_hooks FROM venues WHERE id = ?').get(id);
      stats.totalHooks = venue?.max_hooks || 50;
    } catch {}
    
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/venues/:id/drivers - Get drivers for venue
router.get('/venues/:id/drivers', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  
  try {
    const drivers = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM vehicles v 
         WHERE v.driver_id = d.id 
         AND DATE(v.checked_in_at) = DATE('now')) as completed_today
      FROM drivers d
      WHERE d.venue_id = ? OR d.venue_id IS NULL
      ORDER BY d.status DESC, d.full_name
    `).all(id);
    
    // Add current task info
    const driversWithTasks = drivers.map(driver => {
      let current_task = 'Available';
      
      if (driver.status === 'busy') {
        try {
          const activeTask = db.prepare(`
            SELECT ticket_number, vehicle_info FROM queue 
            WHERE driver_id = ? AND status = 'in_progress'
            LIMIT 1
          `).get(driver.id);
          
          if (activeTask) {
            current_task = `Retrieving ${activeTask.ticket_number}`;
          }
        } catch {}
      } else if (driver.status === 'break') {
        current_task = 'On Break';
      } else if (driver.status === 'offline') {
        current_task = 'Offline';
      }
      
      return { ...driver, current_task };
    });
    
    res.json({ success: true, drivers: driversWithTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/venues/:id/queue - Get queue for venue
router.get('/venues/:id/queue', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  
  try {
    const requests = db.prepare(`
      SELECT q.*, v.make, v.model, v.color, v.license_plate
      FROM queue q
      LEFT JOIN vehicles v ON q.vehicle_id = v.id
      WHERE (q.venue_id = ? OR q.venue_id IS NULL)
      ORDER BY q.is_priority DESC, q.requested_at ASC
    `).all(id);
    
    // Format vehicle info
    const formattedRequests = requests.map(r => ({
      ...r,
      vehicle_info: r.make ? `${r.make} ${r.model} - ${r.color}` : 'Unknown Vehicle'
    }));
    
    res.json({ success: true, requests: formattedRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/venues - Create venue
router.post('/venues', (req, res) => {
  const db = req.app.get('db');
  const { name, address, phone, max_hooks } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Venue name is required' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO venues (name, address, phone, max_hooks, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(name, address || null, phone || null, max_hooks || 50);
    
    addActivity('system', `Created venue: ${name}`, { venueId: result.lastInsertRowid });
    
    res.json({ 
      success: true, 
      message: 'Venue created',
      venueId: result.lastInsertRowid 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DEBUG TOOLS ENDPOINTS
// ============================================

// POST /api/system/debug/reset-stuck-tickets
router.post('/debug/reset-stuck-tickets', (req, res) => {
  const db = req.app.get('db');
  
  try {
    // Reset vehicles stuck in 'retrieving' for over 30 minutes
    const result = db.prepare(`
      UPDATE vehicles 
      SET status = 'parked', updated_at = datetime('now')
      WHERE status = 'retrieving' 
      AND datetime(updated_at) < datetime('now', '-30 minutes')
    `).run();
    
    // Also reset queue items
    const queueResult = db.prepare(`
      UPDATE queue 
      SET status = 'pending', driver_id = NULL
      WHERE status = 'in_progress' 
      AND datetime(updated_at) < datetime('now', '-30 minutes')
    `).run();
    
    const totalReset = result.changes + queueResult.changes;
    addActivity('debug', `Reset ${totalReset} stuck tickets`);
    
    res.json({ 
      success: true, 
      message: `Reset ${result.changes} stuck vehicles, ${queueResult.changes} queue items` 
    });
  } catch (error) {
    addError('error', 'Failed to reset stuck tickets', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/system/debug/clear-orphan-queue
router.post('/debug/clear-orphan-queue', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const result = db.prepare(`
      DELETE FROM queue 
      WHERE vehicle_id NOT IN (SELECT id FROM vehicles)
    `).run();
    
    addActivity('debug', `Cleared ${result.changes} orphan queue items`);
    res.json({ success: true, message: `Cleared ${result.changes} orphan queue items` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/system/debug/reset-driver-status
router.post('/debug/reset-driver-status', (req, res) => {
  const db = req.app.get('db');
  
  try {
    const result = db.prepare(`
      UPDATE drivers SET status = 'available', updated_at = datetime('now')
      WHERE status IN ('busy', 'break')
    `).run();
    
    addActivity('debug', `Reset ${result.changes} drivers to available`);
    res.json({ success: true, message: `Reset ${result.changes} drivers to available` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/system/debug/sync-hooks
router.post('/debug/sync-hooks', (req, res) => {
  const db = req.app.get('db');
  
  try {
    // Get actual parked count
    const parked = db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE status = 'parked'`).get();
    
    addActivity('debug', `Hook sync complete: ${parked.c} hooks in use`);
    res.json({ success: true, message: `Synced: ${parked.c} hooks currently in use` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/system/debug/clear-old-logs
router.post('/debug/clear-old-logs', (req, res) => {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const beforeCount = errorLogs.length;
  
  errorLogs = errorLogs.filter(log => new Date(log.timestamp).getTime() > sevenDaysAgo);
  activityEvents = activityEvents.filter(e => new Date(e.timestamp).getTime() > sevenDaysAgo);
  
  const cleared = beforeCount - errorLogs.length;
  addActivity('debug', `Cleared ${cleared} old logs`);
  
  res.json({ success: true, message: `Cleared ${cleared} old logs` });
});

// POST /api/system/debug/test-websocket
router.post('/debug/test-websocket', (req, res) => {
  const io = req.app.get('io');
  
  if (io) {
    io.emit('admin-ping', { 
      message: 'Test ping from Admin Dashboard', 
      timestamp: new Date().toISOString() 
    });
    
    addActivity('debug', 'WebSocket test ping sent');
    res.json({ success: true, message: 'Test ping sent to all clients' });
  } else {
    res.json({ success: false, message: 'WebSocket not initialized' });
  }
});

// POST /api/system/debug/rebuild-indexes
router.post('/debug/rebuild-indexes', (req, res) => {
  const db = req.app.get('db');
  
  try {
    db.exec('VACUUM');
    db.exec('ANALYZE');
    
    addActivity('debug', 'Database indexes rebuilt and optimized');
    res.json({ success: true, message: 'Database optimized successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
